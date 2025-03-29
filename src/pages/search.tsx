import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import FolderSelector from '@/components/capture/FolderSelector';
import LoadingSkeleton from '@/components/loading';
import { useSearchStore } from '@/store/search-store';
import { rekognitionService } from '@/services/rekognition-service';

export default function SearchPage() {
    const router = useRouter();
    const { image } = router.query;
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [searchProgress, setSearchProgress] = useState(0);
    const [collections, setCollections] = useState<string[]>([]);
    const [availableCollections, setAvailableCollections] = useState<{id: string, folder: string}[]>([]);
    const { setCurrentImage } = useSearchStore();

    // Fetch available collections when component mounts
    useEffect(() => {
        const fetchCollections = async () => {
            try {
                const response = await fetch('/api/collections?public=true');
                if (response.ok) {
                    const data = await response.json();
                    setAvailableCollections(data.collections || []);
                } else {
                    console.error('Failed to fetch collections');
                }
            } catch (error) {
                console.error('Error fetching collections:', error);
            }
        };

        fetchCollections();
    }, []);

    useEffect(() => {
        // First check if we have an image in the URL
        if (typeof image === 'string') {
            setImageSrc(image);
            setCurrentImage(image);
            // Save to localStorage for persistence
            localStorage.setItem('faceRecog_searchImage', image);
            setIsLoading(false);
        } else if (router.isReady) {
            // If not in URL, check localStorage
            const storedImage = localStorage.getItem('faceRecog_searchImage');
            if (storedImage) {
                setImageSrc(storedImage);
                setCurrentImage(storedImage);
                setIsLoading(false);
            } else {
                // If no image is found, redirect to home
                router.push('/');
            }
        }
    }, [image, router, setCurrentImage]);

    const handleFolderSelect = (folderPaths: string[]) => {
        setSelectedFolders(folderPaths);

        // Map selected folders to AWS collections using the real collection data
        const selectedCollections = folderPaths
            .map(folder => {
                const match = availableCollections.find(col => col.folder === folder);
                return match ? match.id : null;
            })
            .filter(Boolean) as string[];

        setCollections(selectedCollections);
    };

    const handleSearch = async () => {
        if (selectedFolders.length === 0) {
            toast.error("Please select at least one folder to search", {
                closeButton: true,
            });
            return;
        }

        if (!imageSrc) {
            toast.error("No image to search with", {
                closeButton: true,
            });
            return;
        }

        // Check if we have valid collections for the selected folders
        if (collections.length === 0) {
            toast.error("No valid collections found for the selected folders", {
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

        // Store selected folders in localStorage
        localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(selectedFolders));

        try {
            // Search each collection for faces
            let allResults: any[] = [];

            for (let i = 0; i < collections.length; i++) {
                const collectionId = collections[i];
                const progress = 10 + Math.floor((i / collections.length) * 80);
                setSearchProgress(progress);

                const result = await rekognitionService.searchFacesByImage(
                    imageSrc,
                    collectionId,
                    10, // maxFaces
                    70  // faceMatchThreshold
                );

                if (result && result.faceMatches && result.faceMatches.length > 0) {
                    // Add folder info to each result
                    const resultsWithFolder = result.faceMatches.map(match => {
                        const folderInfo = availableCollections.find(col => col.id === collectionId);
                        return {
                            ...match,
                            folder: folderInfo?.folder || 'Unknown'
                        };
                    });

                    allResults = [...allResults, ...resultsWithFolder];
                }
            }

            // Store the results in localStorage for the results page
            localStorage.setItem('faceRecog_searchResults', JSON.stringify(allResults));

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
        // Get the image from localStorage to pass back to crop
        const storedImage = localStorage.getItem('faceRecog_searchImage');
        // Direct navigation to crop page
        window.location.href = `/crop?image=${encodeURIComponent(storedImage || '')}`;
    };

    if (isLoading) {
        return (
            <Layout title="Find Face Matches" showHistory={false}>
                <LoadingSkeleton />
            </Layout>
        );
    }

    return (
        <Layout showHistory={false}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
                <Card className="border-slate-200 dark:border-slate-700">
                    <CardContent className="p-6">
                        <div className="text-center mb-6">
                            <h2 className="text-lg font-semibold mb-3">Search Image</h2>
                            <div className="w-32 h-32 mx-auto overflow-hidden rounded-full border-4 border-indigo-100 dark:border-indigo-900">
                                {imageSrc && (
                                    <img
                                        src={imageSrc}
                                        alt="Cropped face"
                                        className="w-full h-full object-cover"
                                    />
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <FolderSelector onFolderSelect={handleFolderSelect} />
            </div>

            <div className="mt-6 flex justify-between space-x-4">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="w-1/2 border border-gray-500"
                    disabled={isSearching}
                >
                    Back
                </Button>
                <Button
                    onClick={handleSearch}
                    disabled={isSearching || selectedFolders.length === 0}
                    className="w-1/2 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                >
                    {isSearching ? (
                        <div className="flex items-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Searching... {searchProgress}%
                        </div>
                    ) : "Search"}
                </Button>
            </div>
        </Layout>
    );
}