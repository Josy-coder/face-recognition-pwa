import { NextApiRequest, NextApiResponse } from 'next';
import { SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { s3Service } from '@/services/s3-service';

// Collection to folder mapping - in a production app, store this in a database
// This should match the mapping used in collections/index.ts
const COLLECTION_TO_FOLDER_MAP: Record<string, string> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { image, collectionId, maxFaces = 10, faceMatchThreshold = 70 } = req.body;

        if (!image || !collectionId) {
            return res.status(400).json({ message: 'Image and collection ID are required' });
        }

        console.log(`Searching for faces in collection: ${collectionId}`);

        // Convert base64 image to buffer
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const rekognition = getRekognitionClient();

        // Search for faces in the collection
        const command = new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: buffer },
            MaxFaces: maxFaces,
            FaceMatchThreshold: faceMatchThreshold,
        });

        const response = await rekognition.send(command);
        console.log(`Found ${response.FaceMatches?.length || 0} face matches`);

        // Determine S3 folder for this collection
        let s3FolderPath = COLLECTION_TO_FOLDER_MAP[collectionId];
        if (!s3FolderPath) {
            // Try to find a matching S3 folder
            const rootFolders = await s3Service.listFolders('');
            const matchingFolder = rootFolders.find(folder => {
                const folderName = folder.replace(/\/$/, ''); // Remove trailing slash
                return folderName === collectionId || folderName.replace(/[-_]/g, '') === collectionId.replace(/[-_]/g, '');
            });

            if (matchingFolder) {
                s3FolderPath = matchingFolder;
                COLLECTION_TO_FOLDER_MAP[collectionId] = matchingFolder;
            } else {
                s3FolderPath = collectionId;
            }
        }

        // Get all images in this folder to map to faces
        const s3Images = await s3Service.listImages(s3FolderPath);
        console.log(`Found ${s3Images.length} images in S3 folder: ${s3FolderPath}`);

        // Create a map of externalImageId/faceId to image URLs
        const imageUrlMap: Record<string, string> = {};

        // Get signed URLs for all images
        for (const image of s3Images) {
            const imageName = image.key.split('/').pop() || '';
            if (imageName) {
                const imageUrl = await s3Service.getImageUrl(image.key);
                if (imageUrl) {
                    // Map by filename without extension as potential external ID
                    const potentialId = imageName.replace(/\.\w+$/, '');
                    imageUrlMap[potentialId] = imageUrl;
                }
            }
        }

        // Process each face match to include an image URL
        const enhancedMatches = await Promise.all((response.FaceMatches || []).map(async (match) => {
            let imageSrc = '/profile-placeholder.jpg'; // Default placeholder
            let personInfo: any = null;
            let folder = s3FolderPath;

            // Try to extract external ID for matching
            const externalId = match.Face?.ExternalImageId;
            if (externalId) {
                console.log(`Processing match with external ID: ${externalId}`);

                // Try to parse ExternalImageId as JSON if it's in JSON format
                if (externalId.startsWith('{') && externalId.endsWith('}')) {
                    try {
                        personInfo = JSON.parse(externalId);

                        // If personInfo contains an s3Key, get its URL
                        if (personInfo.s3Key) {
                            const url = await s3Service.getImageUrl(personInfo.s3Key);
                            if (url) {
                                imageSrc = url;
                                folder = personInfo.s3Folder || folder;
                            }
                        }
                    } catch (e) {
                        console.warn(`Error parsing ExternalImageId as JSON: ${e}`);
                    }
                }

                // If we couldn't get a URL from JSON, try direct mapping with external ID
                if (imageSrc === '/profile-placeholder.jpg' && imageUrlMap[externalId]) {
                    imageSrc = imageUrlMap[externalId];
                }

                // If we still don't have an image, try partial matching with face ID
                if (imageSrc === '/profile-placeholder.jpg' && match.Face?.FaceId) {
                    const faceId = match.Face.FaceId;

                    // Look for any key in the map that might contain the face ID
                    for (const [key, url] of Object.entries(imageUrlMap)) {
                        if (key.includes(faceId.substring(0, 8))) {
                            imageSrc = url;
                            break;
                        }
                    }
                }
            }

            return {
                ...match,
                imageSrc,
                folder,
                personInfo: personInfo || {
                    name: externalId || `Face ${match.Face?.FaceId?.substring(0, 8) || 'Unknown'}`
                }
            };
        }));

        console.log(`Enhanced ${enhancedMatches.length} matches with image URLs`);

        // Return the search results with the face matches enhanced with image URLs
        return res.status(200).json({
            searchedFaceBoundingBox: response.SearchedFaceBoundingBox || null,
            searchedFaceConfidence: response.SearchedFaceConfidence || null,
            faceMatches: enhancedMatches,
            collectionFolder: s3FolderPath
        });

    } catch (error) {
        console.error('Error searching faces:', error);
        return res.status(500).json({ message: 'Error searching faces', error: (error as Error).message });
    }
}