
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/layout/layout';
import LoadingSkeleton from '@/components/loading';
import { useSearchStore, SearchResult } from '@/store/search-store';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function Results() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchedImage, setSearchedImage] = useState<string | null>(null);
    const [, setSearchedFolders] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [, setSelectedResult] = useState<SearchResult | null>(null);
    const [highConfidenceMatches, setHighConfidenceMatches] = useState<SearchResult[]>([]);
    const [otherMatches, setOtherMatches] = useState<SearchResult[]>([]);
    const [showAllMatches, setShowAllMatches] = useState(false);
    const [analysisComplete, setAnalysisComplete] = useState(false);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);
    const [detailsPerson, setDetailsPerson] = useState<SearchResult | null>(null);

    const { addSearchRecord } = useSearchStore();

    useEffect(() => {
        // Get data from localStorage
        const storedImage = localStorage.getItem('faceRecog_searchImage');
        let parsedFolders: string[] = [];
        let storedResults: any[] = [];

        try {
            const foldersString = localStorage.getItem('faceRecog_selectedFolders');
            if (foldersString) {
                parsedFolders = JSON.parse(foldersString);
                setSearchedFolders(parsedFolders);
            }

            const resultsString = localStorage.getItem('faceRecog_searchResults');
            if (resultsString) {
                storedResults = JSON.parse(resultsString);
            }
        } catch (e) {
            console.error('Error parsing data from localStorage:', e);
        }

        if (storedImage) {
            setSearchedImage(storedImage);

            // Simulate API call completion
            setIsLoading(true);
            setAnalysisComplete(false);

            // Process results
            setTimeout(() => {
                setAnalysisComplete(true);

                setTimeout(async () => {
                    // Enhanced process for results - enrich with database information
                    try {
                        const enhancedResults = await enhanceResultsWithPersonInfo(storedResults);
                        processResults(enhancedResults, parsedFolders);
                    } catch (error) {
                        console.error('Error enhancing results:', error);
                        // Fallback to basic processing if enhancement fails
                        processResults(storedResults, parsedFolders);
                    }
                }, 500);
            }, 1000);
        } else {
            // If no image in localStorage, show error state
            setIsLoading(false);
        }
    }, [addSearchRecord]);

    // New function to enhance results with person information from database
    const enhanceResultsWithPersonInfo = async (rawResults: any[]): Promise<any[]> => {
        if (!rawResults || rawResults.length === 0) return [];

        try {
            // Extract face IDs to look up
            const faceIds = rawResults.filter(result => result.Face?.FaceId).map(result => result.Face.FaceId);

            if (faceIds.length === 0) return rawResults;

            // Call API to get person details for these faces
            const response = await fetch('/api/people/details-by-faceids', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ faceIds }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch person details');
            }

            const data = await response.json();
            const personDetailsMap = new Map();

            // Create a map of faceId to person details
            if (data.people && Array.isArray(data.people)) {
                data.people.forEach((person: any) => {
                    if (person.faceId) {
                        personDetailsMap.set(person.faceId, person);
                    }
                });
            }

            // Enhance raw results with person details
            return rawResults.map(result => {
                const faceId = result.Face?.FaceId || result.FaceId;
                const personInfo = personDetailsMap.get(faceId);

                if (personInfo) {
                    return {
                        ...result,
                        firstName: personInfo.firstName || '',
                        middleName: personInfo.middleName || '',
                        lastName: personInfo.lastName || '',
                        name: `${personInfo.firstName || ''} ${personInfo.middleName || ''} ${personInfo.lastName || ''}`.trim(),
                        personInfo
                    };
                }

                // If no person info found, try to extract name from ExternalImageId
                if (result.Face?.ExternalImageId || result.ExternalImageId) {
                    const externalId = result.Face?.ExternalImageId || result.ExternalImageId;
                    // Extract folder path and name from external ID
                    const parts = externalId.split(':');
                    const name = parts[parts.length - 1].replace(/\.jpg$/i, '').replace(/_/g, ' ');

                    return {
                        ...result,
                        name,
                        firstName: name, // Best guess without more info
                        middleName: '',
                        lastName: '',
                        folder: parts.slice(0, -1).join('/').replace(/_/g, ' ')
                    };
                }

                return {
                    ...result,
                    name: 'Unknown Person',
                    firstName: '',
                    middleName: '',
                    lastName: ''
                };
            });
        } catch (error) {
            console.error('Error enhancing results:', error);
            return rawResults;
        }
    };

    // Process the enhanced results
    const processResults = (enhancedResults: any[], folders: string[]) => {
        // Convert to SearchResult format
        const processedResults: SearchResult[] = enhancedResults.map((match, index) => {
            // Use the display name or name we extracted during enhancement
            const name = match.name || 'Unknown Person';

            // Build details object with folder path information
            const details: any = {
                path: match.folder || 'Unknown',
                title: 'Unknown Position',
                department: 'Unknown Department',
                hasUserAccount: match.hasUserAccount || false
            };

            // If we have personInfo, include it in details
            if (match.personInfo) {
                // Extract any additional details
                if (typeof match.personInfo === 'object') {
                    Object.entries(match.personInfo).forEach(([key, value]) => {
                        if (key !== 'name' && key !== 's3Key' && key !== 's3Folder') {
                            details[key] = value;
                        }
                    });
                }
            }

            // Default image is a placeholder if not provided
            const imageSrc = match.imageSrc || '/profile-placeholder.jpg';

            return {
                id: match.Face?.FaceId || match.FaceId || `result-${index}`,
                name: name,
                firstName: match.firstName || '',
                middleName: match.middleName || '',
                lastName: match.lastName || '',
                imageSrc: imageSrc,
                matchConfidence: match.Similarity || 0,
                details: details
            };
        });

        // Sort by confidence
        processedResults.sort((a, b) => b.matchConfidence - a.matchConfidence);

        // Split results into high confidence (98%+) and others
        const highMatches = processedResults.filter(result => result.matchConfidence >= 99);
        const otherMatches = processedResults.filter(result => result.matchConfidence >= 98 && result.matchConfidence < 99);

        setResults(processedResults);
        setHighConfidenceMatches(highMatches);
        setOtherMatches(otherMatches);

        // Set the first high confidence match as selected, if any
        if (highMatches.length > 0) {
            setSelectedResult(highMatches[0]);
        } else if (processedResults.length > 0) {
            setSelectedResult(processedResults[0]);
        }

        // Add to search history
        const searchRecord = {
            imageSrc: searchedImage!,
            folder: folders.join(', ') || 'All folders',
            includeSubfolders: true,
            results: processedResults,
        };

        addSearchRecord(searchRecord);
        setIsLoading(false);
    };

    // Toggle showing all matches
    const toggleShowAllMatches = () => {
        setShowAllMatches(!showAllMatches);
    };

    const getConfidenceLevelColor = (confidence: number): string => {
        if (confidence >= 98) return 'bg-green-500 dark:bg-green-600';
        if (confidence >= 95) return 'bg-emerald-500 dark:bg-emerald-600';
        if (confidence >= 80) return 'bg-blue-500 dark:bg-blue-600';
        if (confidence >= 70) return 'bg-yellow-500 dark:bg-yellow-600';
        return 'bg-slate-500 dark:bg-slate-600';
    };

    const handleNewSearch = () => {
        // Navigate to home page
        window.location.href = '/';
    };

    // View details of a person
    const viewPersonDetails = (result: SearchResult) => {
        setDetailsPerson(result);
        setShowDetailsDialog(true);
    };

    // Format a person's name based on available parts
    const formatPersonName = (person: SearchResult) => {
        if (person.firstName || person.middleName || person.lastName) {
            const parts = [
                person.firstName || '',
                person.middleName || '',
                person.lastName || ''
            ].filter(part => part !== '');

            return parts.join(' ');
        }

        return person.name || 'Unknown Person';
    };

    if (isLoading) {
        return (
            <Layout title="Face Recognition Results" showHistory={true} showNewSearch={true}>
                <div className="relative">
                    {/* Analysis animation overlay */}
                    {!analysisComplete && searchedImage && (
                        <div className="absolute inset-0 z-10 flex items-center justify-center">
                            <Card className="w-full max-w-md border-slate-200 dark:border-slate-700 shadow-xl">
                                <CardContent className="p-6 text-center">
                                    <div className="w-32 h-32 mx-auto relative mb-6">
                                        <img
                                            src={searchedImage}
                                            alt="Analyzing"
                                            className="w-full h-full object-cover rounded-full border-4 border-indigo-100 dark:border-indigo-900"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-full h-full rounded-full border-4 border-t-indigo-600 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">Analyzing Image</h3>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                                        Searching for matches
                                    </p>
                                    <Progress value={analysisComplete ? 100 : 75} className="h-2" />
                                </CardContent>
                            </Card>
                        </div>
                    )}
                    <div className={!analysisComplete ? "blur-sm" : ""}>
                        <LoadingSkeleton />
                    </div>
                </div>
            </Layout>
        );
    }

    // Handle case where we have no image data
    if (!searchedImage) {
        return (
            <Layout title="Error" showHistory={true} showNewSearch={true}>
                <Card>
                    <CardContent className="p-6 text-center">
                        <h2 className="text-xl font-semibold mb-4">Missing Search Image</h2>
                        <p className="mb-6">No search image was provided. Please start a new search.</p>
                        <Button variant="ghost" className="border border-gray-500" onClick={handleNewSearch}>Start New Search</Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

    // Handle no matches at all
    if (results.length === 0) {
        return (
            <Layout title="Face Recognition Results" showHistory={true} showNewSearch={true}>
                <Card className="border-slate-200 dark:border-slate-700 shadow-md">
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Primary Matches</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            We couldn&#39;t find any matches with 99% or higher confidence.
                        </p>
                        <Button onClick={handleNewSearch} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

    // Handle no high confidence matches
    if (highConfidenceMatches.length === 0 && !showAllMatches) {
        return (
            <Layout title="Face Recognition Results" showHistory={true} showNewSearch={true}>
                <div className="grid md:grid-cols-3 gap-6">
                    <div className="md:col-span-1 md:sticky md:top-24 h-fit">
                        <Card className="border-slate-200 dark:border-slate-700">
                            <CardContent className="p-6">
                                <div className="space-y-4">
                                    <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square relative">
                                        {searchedImage && (
                                            <img
                                                src={searchedImage}
                                                alt="Searched face"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <h3 className="font-medium">Your search image</h3>
                                    </div>

                                    <div className="pt-4 space-y-2">
                                        <Button
                                            className="w-full bg-indigo-600 hover:bg-indigo-700"
                                            onClick={toggleShowAllMatches}
                                        >
                                            Show Lower Confidence Matches
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            className="w-full border border-gray-500"
                                            onClick={handleNewSearch}
                                        >
                                            New Search
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-2">
                        <Card className="border-slate-200 dark:border-slate-700 shadow-md">
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500 dark:text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg></div>
                                <h2 className="text-xl font-semibold mb-2">No High Confidence Matches</h2>
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    We couldn&#39;t find any matches with 98% or higher confidence.
                                </p>
                                <Button onClick={toggleShowAllMatches} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                                    Show All Matches
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Layout>
        );
    }

    // Handle showing matches
    return (
        <Layout title="Face Recognition Results" showHistory={true} showNewSearch={true}>
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1 md:sticky md:top-24 h-fit">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 aspect-square relative">
                                    {searchedImage && (
                                        <img
                                            src={searchedImage}
                                            alt="Searched face"
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                <div>
                                    <h3 className="font-medium">Your search image</h3>
                                </div>

                                <div className="pt-4">
                                    {otherMatches.length > 0 && (
                                        <Button
                                            variant="outline"
                                            className="w-full mb-2"
                                            onClick={toggleShowAllMatches}
                                        >
                                            {showAllMatches ? "Show Only High Confidence" : "Show All Matches"}
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        className="w-full border border-gray-500"
                                        onClick={handleNewSearch}
                                    >
                                        New Search
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2 space-y-6">
                    {/* Matches List */}
                    <div>
                        <h3 className="font-semibold text-lg mb-4">
                            {showAllMatches ? 'All Valid Matches' : 'Primary Matches (99%+)'}
                        </h3>
                        <div className="space-y-3">
                            {(showAllMatches ? [...highMatches, ...otherMatches] : highMatches).map(result => (
                                <Card
                                    key={result.id}
                                    className="overflow-hidden transition-colors cursor-pointer border-slate-200 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-400 shadow-md"
                                >
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                <img
                                                    src={result.imageSrc}
                                                    alt={formatPersonName(result)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback to placeholder if image fails to load
                                                        (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                    }}
                                                />
                                            </div>

                                            <div className="flex-grow">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-medium">{formatPersonName(result)}</h4>
                                                    <Badge
                                                        className={`${getConfidenceLevelColor(result.matchConfidence)} text-white`}
                                                    >
                                                        {result.matchConfidence.toFixed(1)}%
                                                    </Badge>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                    onClick={() => viewPersonDetails(result)}
                                                >
                                                    View Details
                                                </Button>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {/* Show more button if there are other matches */}
                            {!showAllMatches && otherMatches.length > 0 && (
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={toggleShowAllMatches}
                                >
                                    Show {otherMatches.length} Additional Match{otherMatches.length !== 1 ? 'es' : ''} (98-99%)
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Person Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="sm:max-w-md bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Person Details</DialogTitle>
                    </DialogHeader>
                    {detailsPerson && (
                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-4">
                                <div className="w-20 h-20 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                                    <img
                                        src={detailsPerson.imageSrc}
                                        alt={formatPersonName(detailsPerson)}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                        }}
                                    />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{formatPersonName(detailsPerson)}</h3>
                                    <Badge className={`${getConfidenceLevelColor(detailsPerson.matchConfidence)} text-white mt-1`}>
                                        {detailsPerson.matchConfidence.toFixed(1)}% Match
                                    </Badge>
                                </div>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-800 rounded-md p-4">
                                <h4 className="font-medium mb-3">Personal Information</h4>
                                <div className="space-y-2">
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            First Name
                                        </div>
                                        <div className="col-span-2 text-sm">
                                            {detailsPerson.firstName || 'Not available'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Middle Name
                                        </div>
                                        <div className="col-span-2 text-sm">
                                            {detailsPerson.middleName || 'Not available'}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-1">
                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                            Last Name
                                        </div>
                                        <div className="col-span-2 text-sm">
                                            {detailsPerson.lastName || 'Not available'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <div className="text-xs text-slate-500">
                                    Location: {detailsPerson.details.path || 'Not available'}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </Layout>
    );
}