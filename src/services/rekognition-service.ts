import { toast } from 'sonner';

export interface SearchResult {
    FaceId: string;
    Similarity: number;
    Face?: {
        FaceId: string;
        ExternalImageId?: string;
        Confidence: number;
        ImageId?: string;
    };
    ExternalImageId?: string;
    imageSrc?: string;
    folder?: string;
    personInfo?: any;
}

export interface SearchFacesResponse {
    searchedFaceBoundingBox: {
        Width: number;
        Height: number;
        Left: number;
        Top: number;
    } | null;
    searchedFaceConfidence: number | null;
    faceMatches: SearchResult[];
}

class RekognitionService {
    /**
     * Search for face matches in a collection
     */
    async searchFacesByImage(
        image: string,
        collectionId: string,
        maxFaces = 10,
        faceMatchThreshold = 70
    ): Promise<SearchFacesResponse | null> {
        try {
            console.log(`Searching for faces in collection ${collectionId} with threshold ${faceMatchThreshold}`);

            const response = await fetch('/api/search-faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image,
                    collectionId,
                    maxFaces,
                    faceMatchThreshold,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Search faces API error:', error);
                throw new Error(error.message || 'Error searching for faces');
            }

            const result = await response.json();
            console.log(`Found ${result.faceMatches?.length || 0} face matches`);

            return result;
        } catch (error) {
            console.error('Error searching for faces:', error);
            toast.error('Failed to search for faces');
            return null;
        }
    }

    /**
     * Compare two faces directly (not using collections)
     */
    async compareFaces(
        sourceImage: string,
        targetImage: string,
        similarityThreshold = 70
    ) {
        try {
            const response = await fetch('/api/compare-faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceImage,
                    targetImage,
                    similarityThreshold,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error comparing faces');
            }

            return await response.json();
        } catch (error) {
            console.error('Error comparing faces:', error);
            toast.error('Failed to compare faces');
            return null;
        }
    }

    /**
     * Compare a face image to a specific FaceId in a collection
     */
    async compareFaceToFaceId(
        sourceImage: string,
        faceId: string,
        similarityThreshold = 70
    ) {
        try {
            const response = await fetch('/api/compare-face-to-id', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    sourceImage,
                    faceId,
                    similarityThreshold,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error comparing face to ID');
            }

            const result = await response.json();
            return {
                matched: result.matched || false,
                similarity: result.similarity || 0,
                faceId: result.faceId || null
            };
        } catch (error) {
            console.error('Error comparing face to ID:', error);
            toast.error('Failed to verify face');
            return {
                matched: false,
                similarity: 0,
                faceId: null
            };
        }
    }

    /**
     * Get all available collections (for admin use)
     */
    async getCollections(authHeader: string) {
        try {
            const response = await fetch('/api/collections', {
                headers: {
                    'Authorization': authHeader,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error fetching collections');
            }

            return await response.json();
        } catch (error) {
            console.error('Error fetching collections:', error);
            throw error;
        }
    }

    /**
     * Index face in collection
     */
    async indexFace(
        image: string,
        collectionId: string,
        externalImageId: string
    ) {
        try {
            const response = await fetch('/api/index-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image,
                    collectionId,
                    externalImageId,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error indexing face');
            }

            return await response.json();
        } catch (error) {
            console.error('Error indexing face:', error);
            toast.error('Failed to index face');
            return null;
        }
    }

    /**
     * Index face from image data
     */
    async indexFaceFromImage(
        image: string,
        collectionId: string,
        externalImageId: string
    ) {
        try {
            const response = await fetch('/api/collections/' + collectionId + '/faces', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image,
                    externalImageId
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error indexing face');
            }

            return await response.json();
        } catch (error) {
            console.error('Error indexing face from image:', error);
            toast.error('Failed to index face');
            return null;
        }
    }

    /**
     * Delete faces from a collection
     */
    async deleteFaceFromCollection(
        collectionId: string,
        faceIds: string[]
    ) {
        try {
            const response = await fetch(`/api/collections/${collectionId}/faces`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    faceIds
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Error deleting faces');
            }

            return await response.json();
        } catch (error) {
            console.error('Error deleting faces:', error);
            toast.error('Failed to delete face');
            return null;
        }
    }
}

// Export a singleton instance
export const rekognitionService = new RekognitionService();