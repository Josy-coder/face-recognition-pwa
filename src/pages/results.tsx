import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import Layout from '@/components/layout/layout';
import LoadingSkeleton from '@/components/loading';
import { useSearchStore } from '@/store/search-store';

interface SearchResult {
    id: string;
    name: string;
    imageSrc: string;
    matchConfidence: number;
    details: {
        path: string;
        additionalInfo?: string;
        title?: string;
        department?: string;
        email?: string;
        phone?: string;
        [key: string]: unknown;
    };
}

export default function Results() {
    const [isLoading, setIsLoading] = useState(true);
    const [searchedImage, setSearchedImage] = useState<string | null>(null);
    const [searchedFolders, setSearchedFolders] = useState<string[]>([]);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [selectedResult, setSelectedResult] = useState<SearchResult | null>(null);
    const [analysisComplete, setAnalysisComplete] = useState(false);

    const { addSearchRecord } = useSearchStore();

    useEffect(() => {
        // Get data from localStorage
        const storedImage = localStorage.getItem('faceRecog_searchImage');
        let parsedFolders: string[] = [];

        try {
            const storedFolders = localStorage.getItem('faceRecog_selectedFolders');
            if (storedFolders) {
                parsedFolders = JSON.parse(storedFolders);
            }
        } catch (e) {
            console.error('Error parsing folders from localStorage:', e);
        }

        if (storedImage) {
            setSearchedImage(storedImage);
            setSearchedFolders(parsedFolders);

            // Simulate API call to expertum.ai
            setIsLoading(true);
            setAnalysisComplete(false);

            // Mock data for demonstration
            const mockResults: SearchResult[] = [
                {
                    id: '1',
                    name: 'John Smith',
                    imageSrc: '/profile-1.jpg',
                    matchConfidence: 98.7,
                    details: {
                        path: 'Employees/Engineering',
                        title: 'Senior Developer',
                        department: 'Engineering',
                        email: 'john.smith@example.com',
                        phone: '+1 (555) 123-4567'
                    }
                },
                {
                    id: '2',
                    name: 'Sarah Johnson',
                    imageSrc: '/profile-2.jpg',
                    matchConfidence: 87.2,
                    details: {
                        path: 'Employees/Marketing',
                        title: 'Marketing Manager',
                        department: 'Marketing',
                        email: 'sarah.j@example.com',
                        phone: '+1 (555) 987-6543'
                    }
                },
                {
                    id: '3',
                    name: 'Michael Wong',
                    imageSrc: '/profile-3.jpg',
                    matchConfidence: 72.5,
                    details: {
                        path: 'Employees/Sales',
                        title: 'Sales Representative',
                        department: 'Sales',
                        email: 'm.wong@example.com',
                        phone: '+1 (555) 456-7890'
                    }
                }
            ];

            // Show analysis animation for 2 seconds
            setTimeout(() => {
                setAnalysisComplete(true);

                // Then show results after another second
                setTimeout(() => {
                    setResults(mockResults);
                    if (mockResults.length > 0) {
                        setSelectedResult(mockResults[0]);
                    }

                    // Add to search history
                    addSearchRecord({
                        id: Date.now().toString(),
                        imageSrc: storedImage,
                        folder: parsedFolders.join(', ') || 'All folders',
                        includeSubfolders: true,
                        timestamp: new Date().toISOString(),
                        results: mockResults,
                    });

                    setIsLoading(false);
                }, 1000);
            }, 2000);
        } else {
            // If no image in localStorage, show error state
            setIsLoading(false);
        }
    }, [addSearchRecord]);

    const getConfidenceLevelColor = (confidence: number): string => {
        if (confidence >= 95) return 'bg-green-500 dark:bg-green-600';
        if (confidence >= 80) return 'bg-emerald-500 dark:bg-emerald-600';
        if (confidence >= 70) return 'bg-blue-500 dark:bg-blue-600';
        if (confidence >= 60) return 'bg-yellow-500 dark:bg-yellow-600';
        return 'bg-slate-500 dark:bg-slate-600';
    };

    const getConfidenceLevelText = (confidence: number): string => {
        if (confidence >= 95) return 'Very High Match';
        if (confidence >= 80) return 'High Match';
        if (confidence >= 70) return 'Moderate Match';
        if (confidence >= 60) return 'Possible Match';
        return 'Low Match';
    };

    const handleNewSearch = () => {
        // Navigate to home page
        window.location.href = '/';
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
                                        Searching for matches in {searchedFolders.length} folders
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
                        <Button variant={"ghost"} className="border border-gray-500" onClick={handleNewSearch}>Start New Search</Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

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
                        <h2 className="text-xl font-semibold mb-2">No Matching Results</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            We couldn&#39;t find any matches for the provided face image in the selected folders.
                        </p>
                        <Button onClick={handleNewSearch} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                            Try Again
                        </Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

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
                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Folders: {searchedFolders.length > 0
                                        ? searchedFolders.length > 2
                                            ? `${searchedFolders.length} folders selected`
                                            : searchedFolders.join(', ')
                                        : 'All folders'
                                    }
                                    </p>
                                </div>

                                <div className="pt-4">
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
                    {selectedResult && (
                        <Card className="overflow-hidden border-slate-200 dark:border-slate-700">
                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 border-b border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between">
                                    <h2 className="font-semibold text-lg">Primary Match</h2>
                                    <Badge
                                        className={`${getConfidenceLevelColor(selectedResult.matchConfidence)} text-white`}
                                    >
                                        {selectedResult.matchConfidence.toFixed(1)}% Match
                                    </Badge>
                                </div>
                            </div>

                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-full md:w-1/3">
                                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 mb-4">
                                            <img
                                                src={selectedResult.imageSrc}
                                                alt={selectedResult.name}
                                                className="object-cover w-full h-full"
                                            />
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Match confidence</p>
                                        <div className="flex items-center gap-2 mb-3">
                                            <Progress
                                                value={selectedResult.matchConfidence}
                                                className="h-2"
                                            />
                                            <span className="text-sm font-medium">{selectedResult.matchConfidence.toFixed(1)}%</span>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{getConfidenceLevelText(selectedResult.matchConfidence)}</p>
                                    </div>

                                    <div className="w-full md:w-2/3 space-y-4">
                                        <div>
                                            <h3 className="text-2xl font-bold">{selectedResult.name}</h3>
                                            <p className="text-slate-600 dark:text-slate-400">{selectedResult.details?.title}</p>
                                        </div>

                                        <Tabs defaultValue="details">
                                            <TabsList>
                                                <TabsTrigger value="details">Details</TabsTrigger>
                                                <TabsTrigger value="location">Location</TabsTrigger>
                                            </TabsList>

                                            <TabsContent value="details" className="space-y-4 pt-4">
                                                {selectedResult.details && Object.entries(selectedResult.details)
                                                    .filter(([key]) => key !== 'title' && key !== 'path')
                                                    .map(([key, value]) => (
                                                        <div key={key} className="grid grid-cols-3 gap-1">
                                                            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 capitalize">
                                                                {key.replace(/([A-Z])/g, ' $1').trim()}
                                                            </div>
                                                            <div className="col-span-2 text-sm">
                                                                {String(value)}
                                                            </div>
                                                        </div>
                                                    ))
                                                }
                                            </TabsContent>

                                            <TabsContent value="location" className="pt-4">
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-3 gap-1">
                                                        <div className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                            Path
                                                        </div>
                                                        <div className="col-span-2 text-sm">
                                                            {selectedResult.details.path}
                                                        </div>
                                                    </div>
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {results.length > 1 && (
                        <div>
                            <h3 className="font-semibold text-lg mb-4">Other Potential Matches</h3>
                            <div className="space-y-3">
                                {results.slice(1).map(result => (
                                    <Card
                                        key={result.id}
                                        className={`
                      overflow-hidden transition-colors cursor-pointer 
                      ${selectedResult?.id === result.id ? 'border-indigo-500 dark:border-indigo-400' : 'border-slate-200 dark:border-slate-700'} 
                      hover:border-indigo-500 dark:hover:border-indigo-400 shadow-md
                    `}
                                        onClick={() => setSelectedResult(result)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 flex-shrink-0">
                                                    <img
                                                        src={result.imageSrc}
                                                        alt={result.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>

                                                <div className="flex-grow">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className="font-medium">{result.name}</h4>
                                                        <Badge
                                                            className={`${getConfidenceLevelColor(result.matchConfidence)} text-white`}
                                                        >
                                                            {result.matchConfidence.toFixed(1)}%
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">{result.details?.title}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}