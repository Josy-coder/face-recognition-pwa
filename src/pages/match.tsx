import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/layout';
import { useSearchStore } from '@/store/search-store';
import { ArrowLeft, RefreshCw, Info } from 'lucide-react';

// Match confidence threshold as per client requirements
const CONFIDENCE_THRESHOLD = 98.0;

// Result type definition
interface MatchResult {
    id: string;
    name: string;
    matchConfidence: number;
    imageSrc: string;
    details: {
        path: string;
        // Add any other fields displayed in details
        firstName?: string;
        middleName?: string;
        lastName?: string;
        [key: string]: any;
    };
}

export default function ResultsPage() {
    const router = useRouter();
    const [searchImage, setSearchImage] = useState<string | null>(null);
    const [searchResults, setSearchResults] = useState<MatchResult[]>([]);
    const [highConfidenceResults, setHighConfidenceResults] = useState<MatchResult[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedResult, setSelectedResult] = useState<MatchResult | null>(null);
    const [showAllResults, setShowAllResults] = useState(false);

    // Get addSearchRecord function from search store
    const { addSearchRecord } = useSearchStore();

    useEffect(() => {
        // Retrieve search data from localStorage
        const savedImage = localStorage.getItem('faceRecog_searchImage');
        const savedResults = localStorage.getItem('faceRecog_searchResults');
        const selectedFolders = localStorage.getItem('faceRecog_selectedFolders');

        if (savedImage) {
            setSearchImage(savedImage);
        }

        if (savedResults) {
            try {
                const parsedResults = JSON.parse(savedResults) as MatchResult[];
                setSearchResults(parsedResults);

                // Filter high confidence results (98%+)
                const highConfidence = parsedResults.filter(
                    result => result.matchConfidence >= CONFIDENCE_THRESHOLD
                );
                setHighConfidenceResults(highConfidence);

                // Save to search history
                if (parsedResults.length > 0 && savedImage) {
                    const folders = selectedFolders ? JSON.parse(selectedFolders) : ['PNG'];
                    addSearchRecord({
                        id: Date.now().toString(),
                        timestamp: new Date().toISOString(),
                        imageSrc: savedImage,
                        results: parsedResults,
                        folder: folders[0] || 'PNG',
                        includeSubfolders: false // Add the missing property
                    });
                }
            } catch (e) {
                console.error('Error parsing search results:', e);
            }
        }

        setIsLoading(false);
    }, [addSearchRecord]);

    // Handle "View Details" button click
    const viewDetails = (result: MatchResult) => {
        setSelectedResult(result);
    };

    // Handle "Back to Results" button click
    const backToResults = () => {
        setSelectedResult(null);
    };

    // Handle "New Search" button click
    const newSearch = () => {
        router.push('/');
    };

    // Determine confidence level color based on match percentage
    const getConfidenceLevelColor = (confidence: number): string => {
        if (confidence >= 98) return 'bg-green-500';
        if (confidence >= 90) return 'bg-emerald-500';
        if (confidence >= 80) return 'bg-blue-500';
        if (confidence >= 70) return 'bg-yellow-500';
        return 'bg-slate-500';
    };

    // Format person's full name from parts
    const getFullName = (result: MatchResult): string => {
        const { firstName, middleName, lastName } = result.details;

        const nameParts = [
            firstName,
            middleName,
            lastName
        ].filter(Boolean);

        return nameParts.length > 0 ? nameParts.join(' ') : result.name;
    };

    if (isLoading) {
        return (
            <Layout title="Loading Results..." showHistory={true} showNewSearch={true}>
                <div className="flex justify-center items-center h-64">
                    <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
            </Layout>
        );
    }

    // Show details view if a result is selected
    if (selectedResult) {
        return (
            <>
                <Head>
                    <title>Match Details - PNG Pess Book</title>
                    <meta name="description" content="Face match details" />
                </Head>
                <Layout title="Match Details" showHistory={true} showNewSearch={true}>
                    <div className="mb-4">
                        <Button
                            variant="ghost"
                            onClick={backToResults}
                            className="flex items-center"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Results
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Card className="overflow-hidden border-none shadow-md">
                                <CardHeader className="bg-slate-50">
                                    <CardTitle className="text-xl">Match Information</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex items-center mb-6">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-bold">{getFullName(selectedResult)}</h2>

                                            <Badge
                                                className={`mt-2 ${getConfidenceLevelColor(selectedResult.matchConfidence)} text-white`}
                                            >
                                                {selectedResult.matchConfidence.toFixed(1)}% Match
                                            </Badge>
                                        </div>
                                        <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={selectedResult.imageSrc}
                                                alt={selectedResult.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-sm font-medium text-slate-500">First Name</h3>
                                            <p>{selectedResult.details.firstName || 'N/A'}</p>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-slate-500">Middle Name</h3>
                                            <p>{selectedResult.details.middleName || 'N/A'}</p>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium text-slate-500">Last Name</h3>
                                            <p>{selectedResult.details.lastName || 'N/A'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <Card className="overflow-hidden border-none shadow-md">
                                <CardHeader className="bg-slate-50">
                                    <CardTitle className="text-xl">Comparison</CardTitle>
                                </CardHeader>
                                <CardContent className="p-6">
                                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-4">
                                        <div className="text-center">
                                            <div className="w-32 h-32 mx-auto mb-2 rounded-md overflow-hidden border border-slate-200">
                                                {searchImage && (
                                                    <img
                                                        src={searchImage}
                                                        alt="Search"
                                                        className="w-full h-full object-cover"
                                                    />
                                                )}
                                            </div>
                                            <p className="text-sm text-slate-500">Search Image</p>
                                        </div>

                                        <div className="text-2xl text-slate-300">vs</div>

                                        <div className="text-center">
                                            <div className="w-32 h-32 mx-auto mb-2 rounded-md overflow-hidden border border-slate-200">
                                                <img
                                                    src={selectedResult.imageSrc}
                                                    alt={selectedResult.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                            <p className="text-sm text-slate-500">Matched Person</p>
                                        </div>
                                    </div>

                                    <div className="mt-6 text-center">
                                        <p className="text-sm text-slate-500 mb-2">Match Confidence</p>
                                        <div className="text-2xl font-bold text-green-600">
                                            {selectedResult.matchConfidence.toFixed(1)}%
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Search Results - PNG Pess Book</title>
                <meta name="description" content="Face match search results" />
            </Head>
            <Layout title="Search Results" showHistory={true} showNewSearch={true}>
                <div className="mb-6">
                    <Card className="overflow-hidden border-none shadow-md">
                        <CardContent className="p-0">
                            <div className="flex flex-col md:flex-row">
                                <div className="md:w-1/3 p-4 bg-slate-50 flex justify-center items-center">
                                    {searchImage ? (
                                        <div className="w-32 h-32 rounded-md overflow-hidden border-4 border-white shadow-md">
                                            <img
                                                src={searchImage}
                                                alt="Search Image"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    ) : (
                                        <div className="w-32 h-32 rounded-md bg-slate-200 flex items-center justify-center">
                                            <span className="text-slate-400">No Image</span>
                                        </div>
                                    )}
                                </div>

                                <div className="md:w-2/3 p-6">
                                    <h2 className="text-xl font-semibold mb-2">Match Results</h2>

                                    {highConfidenceResults.length === 0 ? (
                                        <div className="text-slate-500">
                                            <p className="mb-4">No high-confidence matches found (98% or higher).</p>

                                            {searchResults.length > 0 ? (
                                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md flex">
                                                    <Info size={20} className="text-amber-500 mr-2 flex-shrink-0" />
                                                    <div>
                                                        <p className="text-amber-800 dark:text-amber-300 text-sm">
                                                            {searchResults.length} lower confidence match{searchResults.length !== 1 ? 'es' : ''} found.
                                                            <button
                                                                onClick={() => setShowAllResults(true)}
                                                                className="ml-1 text-indigo-600 hover:underline focus:outline-none"
                                                            >
                                                                View all matches
                                                            </button>
                                                        </p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p>Try a different search image for better results.</p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="mb-4">
                                            Found {highConfidenceResults.length} high-confidence match{highConfidenceResults.length !== 1 ? 'es' : ''}.
                                        </p>
                                    )}

                                    <div className="mt-4">
                                        <Button onClick={newSearch} className="bg-indigo-600 hover:bg-indigo-700">
                                            New Search
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Display high confidence results (98%+) by default */}
                {highConfidenceResults.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {highConfidenceResults.map((result) => (
                            <Card key={result.id} className="overflow-hidden border-none shadow-md">
                                <CardContent className="p-4">
                                    <div className="flex items-center mb-4">
                                        <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-100 mr-4">
                                            <img
                                                src={result.imageSrc}
                                                alt={result.name}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold truncate max-w-[150px]">{getFullName(result)}</h3>
                                            <Badge className={`${getConfidenceLevelColor(result.matchConfidence)} text-white mt-1`}>
                                                {result.matchConfidence.toFixed(1)}% Match
                                            </Badge>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => viewDetails(result)}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        View Details
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Show all results dialog when user selects "View all matches" */}
                {showAllResults && searchResults.length > 0 && highConfidenceResults.length === 0 && (
                    <div className="mt-6">
                        <Card className="overflow-hidden border-none shadow-md">
                            <CardHeader className="bg-slate-50">
                                <CardTitle className="text-lg">
                                    All Matches (Including Low Confidence)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {searchResults.map((result) => (
                                        <Card key={result.id} className="overflow-hidden border">
                                            <CardContent className="p-4">
                                                <div className="flex items-center mb-4">
                                                    <div className="w-14 h-14 rounded-full overflow-hidden border border-slate-200 mr-3">
                                                        <img
                                                            src={result.imageSrc}
                                                            alt={result.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-medium text-sm truncate max-w-[150px]">{getFullName(result)}</h3>
                                                        <Badge className={`${getConfidenceLevelColor(result.matchConfidence)} text-white mt-1 text-xs`}>
                                                            {result.matchConfidence.toFixed(1)}% Match
                                                        </Badge>
                                                    </div>
                                                </div>

                                                <Button
                                                    onClick={() => viewDetails(result)}
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full"
                                                >
                                                    View Details
                                                </Button></CardContent>
                                        </Card>
                                    ))}
                                </div>

                                <div className="flex justify-center mt-6">
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowAllResults(false)}
                                    >
                                        Hide Low Confidence Matches
                                    </Button>
                                </div>

                                <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-md mt-6">
                                    <p className="text-sm text-amber-800 dark:text-amber-300 flex items-start">
                                        <Info size={18} className="mr-2 flex-shrink-0 mt-0.5" />
                                        <span>
                      These matches have a confidence level below 98%. The system is less certain about these matches, 
                      so please verify carefully before making any decisions based on this information.
                    </span>
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {highConfidenceResults.length === 0 && searchResults.length === 0 && (
                    <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-md">
                        <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-700 rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-slate-400">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-2">No Matches Found</h3>
                        <p className="text-slate-500 max-w-md mx-auto mb-6">
                            We couldn&#39;t find any matches for this face in our database. Try a different photo or angle for better results.
                        </p>
                        <Button
                            onClick={newSearch}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Try Another Search
                        </Button>
                    </div>
                )}
            </Layout>
        </>
    );
}