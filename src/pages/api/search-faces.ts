import { NextApiRequest, NextApiResponse } from 'next';
import { SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { s3Service } from '@/services/s3-service';
import { convertExternalIdToS3Path } from '@/utils/path-conversion';


// This map is used to cache the S3 folder paths for collections
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

        // Get all images in all subfolders recursively
        const s3Images = await s3Service.listAllImagesRecursively(s3FolderPath);
        console.log(`Found ${s3Images.length} images in S3 folder structure starting at: ${s3FolderPath}`);

        // Create a map for quick lookup by externalId and by S3 path
        const imageMap = new Map();
        s3Images.forEach(image => {
            if (image.externalId) {
                imageMap.set(image.externalId, image);
            }
            imageMap.set(image.key, image);
        });

        // Process each face match to include an image URL
        const enhancedMatches = await Promise.all((response.FaceMatches || []).map(async (match) => {
            let imageSrc = '/profile-placeholder.jpg'; // Default placeholder
            let personInfo: any = null;
            let folder = s3FolderPath;
            let s3Key: string | null = null;

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
                                s3Key = personInfo.s3Key;
                                folder = personInfo.s3Folder || folder;
                            }
                        }
                    } catch (e) {
                        console.warn(`Error parsing ExternalImageId as JSON: ${e}`);
                    }
                }

                // If externalId follows our convention (contains colons), convert it to S3 path
                if (!s3Key && externalId.includes(':')) {
                    const s3Path = convertExternalIdToS3Path(externalId);

                    // Look for this exact path
                    if (imageMap.has(s3Path)) {
                        const matchedImage = imageMap.get(s3Path);
                        s3Key = matchedImage.key;

                        // Get the URL
                        const url = await s3Service.getImageUrl(s3Key);
                        if (url) {
                            imageSrc = url;
                        }

                        // Extract folder
                        const lastSlashIndex = s3Path.lastIndexOf('/');
                        if (lastSlashIndex !== -1) {
                            folder = s3Path.substring(0, lastSlashIndex);
                        }
                    } else {
                        // Try to find any image with a similar path
                        for (const image of s3Images) {
                            if (image.key === s3Path || image.key.endsWith('/' + s3Path)) {
                                s3Key = image.key;
                                const url = await s3Service.getImageUrl(s3Key);
                                if (url) {
                                    imageSrc = url;
                                    break;
                                }
                            }
                        }
                    }
                }

                // If we still don't have an image URL, try direct matching with external ID
                if (imageSrc === '/profile-placeholder.jpg' && externalId && imageMap.has(externalId)) {
                    const matchedImage = imageMap.get(externalId);
                    s3Key = matchedImage.key;
                    const url = await s3Service.getImageUrl(s3Key);
                    if (url) {
                        imageSrc = url;
                    }
                }

                // If we still don't have an image, try partial matching with face ID
                if (imageSrc === '/profile-placeholder.jpg' && match.Face?.FaceId) {
                    const faceId = match.Face.FaceId;

                    // Look for any key in the map that might contain the face ID
                    for (const [key, image] of imageMap.entries()) {
                        if (key.includes(faceId.substring(0, 8))) {
                            s3Key = image.key;
                            const url = await s3Service.getImageUrl(s3Key);
                            if (url) {
                                imageSrc = url;
                                break;
                            }
                        }
                    }
                }
            }

            // Determine name and other info from external ID
            let name = 'Unknown';
            if (externalId) {
                if (personInfo?.name) {
                    name = personInfo.name;
                } else if (externalId.includes(':')) {
                    // Extract filename from the last segment of the external ID
                    const parts = externalId.split(':');
                    const filename = parts[parts.length - 1];

                    // Remove extension if present
                    const nameWithoutExt = filename.replace(/\.[^/.]+$/, "");

                    // Format the name (replace underscores with spaces)
                    name = nameWithoutExt.replace(/_/g, ' ');
                } else {
                    name = externalId.replace(/-/g, ' ');
                }
            }

            // Get folder hierarchy as path segments
            const folderSegments = folder.split('/').filter(Boolean);

            return {
                ...match,
                imageSrc,
                folder,
                folderSegments,
                s3Key,
                ExternalImageId: externalId,
                displayName: name,
                personInfo: personInfo || {
                    name
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