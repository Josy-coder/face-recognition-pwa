import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import LoadingSkeleton from '@/components/loading';
import { Progress } from '@/components/ui/progress';
import { useSearchStore } from '@/store/search-store';
import { rekognitionService } from '@/services/rekognition-service';

export default function SearchPage() {
    const router = useRouter();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const { setCurrentImage } = useSearchStore();

    useEffect(() => {
        // Check if we have an image in localStorage (set from home page)
        const storedImage = localStorage.getItem('faceRecog_searchImage');
        if (storedImage) {
            setImageSrc(storedImage);
            setCurrentImage(storedImage);
            setIsLoading(false);
        } else {
            // If no image is found, redirect to home
            router.push('/');
        }
    }, [router, setCurrentImage]);

    const handleSearch = async () => {
        if (!imageSrc) {
            toast.error("No image to search with", {
                closeButton: true,
            });
            return;
        }

        setIsSearching(true);
        setSearchProgress(10);

        // Show analyzing animation
        toast.info("Analyzing image...", {
            closeButton: true,
        });

        try {
            // Default to the PNG collection
            const collectionId = 'PNG';

            setSearchProgress(30);

            // Search the collection for faces
            const result = await rekognitionService.searchFacesByImage(
                imageSrc,
                collectionId,
                10, // maxFaces
                70  // faceMatchThreshold
            );

            console.log('Search results:', result);
            setSearchProgress(80);

            if (!result) {
                throw new Error('No results returned from search');
            }

            // Store the enhanced results in localStorage for the results page
            localStorage.setItem('faceRecog_searchResults', JSON.stringify(result.faceMatches || []));
            localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(['PNG']));

            setSearchProgress(100);

            // Navigate to results page
            setTimeout(() => {
                window.location.href = '/results';
            }, 500);
        } catch (error) {
            console.error('Search error:', error);
            toast.error('An error occurred during search');
            setIsSearching(false);
        }
    };

    const handleBack = () => {
        // Navigate back to home page
        router.push('/');
    };

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Match Face</title>
                    <meta name="description" content="Match your face with our database" />
                </Head>
                <Layout title="Match Face" showHistory={false}>
                    <LoadingSkeleton />
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Match Face</title>
                <meta name="description" content="Match your face with our database" />
            </Head>
            <Layout title="Match Your Face" showHistory={false}>
                <div className="max-w-lg mx-auto">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-center">Ready to Match</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="text-center mb-6">
                                <p className="text-slate-600 dark:text-slate-400 mb-6">
                                    We&#39;ll search for matches in our database using this image
                                </p>
                                <div className="w-48 h-48 mx-auto overflow-hidden rounded-full border-4 border-indigo-100 dark:border-indigo-900">
                                    {imageSrc && (
                                        <img
                                            src={imageSrc}
                                            alt="Face to match"
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>
                            </div>

                            {isSearching && (
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span className="text-sm font-medium">Searching...</span>
                                        <span className="text-sm">{searchProgress}%</span>
                                    </div>
                                    <Progress value={searchProgress} className="h-2" />
                                </div>
                            )}

                            <div className="flex justify-between space-x-4">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    className="w-1/2"
                                    disabled={isSearching}
                                >
                                    Back
                                </Button>
                                <Button
                                    onClick={handleSearch}
                                    disabled={isSearching}
                                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                >
                                    {isSearching ? (
                                        <div className="flex items-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Searching...
                                        </div>
                                    ) : "Find Matches"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}