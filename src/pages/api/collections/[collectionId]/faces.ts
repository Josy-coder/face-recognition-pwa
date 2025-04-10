import { NextApiRequest, NextApiResponse } from 'next';
import {
    IndexFacesCommand,
    ListFacesCommand,
    DeleteFacesCommand
} from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { s3Service } from '@/services/s3-service';
import { v4 as uuidv4 } from 'uuid';
import { convertExternalIdToS3Path, convertS3PathToExternalId } from '@/utils/path-conversion';

// Simple auth middleware
const isAdmin = (req: NextApiRequest) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return false;
    }

    // Decode the base64 credentials
    const credentials = Buffer.from(authHeader.split(' ')[1], 'base64').toString('utf-8');
    const [username, password] = credentials.split(':');

    // Compare with environment variables
    return username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD;
};

// Check if this is a public registration request
const isPublicRegistration = (req: NextApiRequest, collectionId: string) => {
    // Allow public registration only for the PNG collection
    // You can add more specific logic here if needed
    return req.method === 'POST' && collectionId === 'PNG' &&
        // Check if the request has registration data
        req.body && req.body.image && req.body.externalImageId;
};

// Collection to folder mapping - in a production app, store this in a database
const COLLECTION_TO_FOLDER_MAP: Record<string, string> = {};

// Face metadata storage - in a production app, store this in a database
const faceMetadata: Record<string, any> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { collectionId } = req.query;

    if (!collectionId || Array.isArray(collectionId)) {
        return res.status(400).json({ message: 'Valid collection ID is required' });
    }

    // Admin check for POST and DELETE, with exception for public registration
    if ((req.method === 'POST' || req.method === 'DELETE') &&
        !isAdmin(req) && !isPublicRegistration(req, collectionId)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const rekognition = getRekognitionClient();

    // Index a face
    if (req.method === 'POST') {
        try {
            const { image, externalImageId, detectionAttributes = [], additionalInfo = {} } = req.body;

            if (!image) {
                return res.status(400).json({ message: 'Image is required' });
            }

            // Validate externalImageId - AWS requires alphanumeric characters,
            // underscores, hyphens, periods, and colons only
            let sanitizedId = externalImageId;
            if (externalImageId && !/^[a-zA-Z0-9_\-.:%]+$/.test(externalImageId)) {
                // Create a valid ID but save the original in metadata
                sanitizedId = `face-${uuidv4()}`;
                additionalInfo.originalId = externalImageId;
            } else if (!externalImageId) {
                // Generate a UUID-based ID if none provided
                sanitizedId = `face-${uuidv4()}`;
            }

            // Convert base64 image to Uint8Array
            const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

            // Determine the S3 folder path for this collection
            let s3FolderPath = COLLECTION_TO_FOLDER_MAP[collectionId];
            if (!s3FolderPath) {
                // Try to find a matching S3 folder
                const rootFolders = await s3Service.listFolders('');
                const matchingFolder = rootFolders.find(folder =>
                    folder.replace(/\/$/, '') === collectionId
                );

                if (matchingFolder) {
                    s3FolderPath = matchingFolder;
                    COLLECTION_TO_FOLDER_MAP[collectionId] = matchingFolder;
                } else {
                    s3FolderPath = collectionId;
                }
            }

            // Extract folder path from externalImageId if it follows our convention
            let targetFolder = s3FolderPath;
            if (sanitizedId.includes(':')) {
                // If the externalImageId already includes a path structure, extract it
                const s3Path = convertExternalIdToS3Path(sanitizedId);
                const lastSlashIndex = s3Path.lastIndexOf('/');
                if (lastSlashIndex !== -1) {
                    targetFolder = s3Path.substring(0, lastSlashIndex);
                }
            }

            // Generate a filename from externalImageId if necessary
            let filename;
            if (sanitizedId.includes(':')) {
                // Extract filename from the external ID (last part after colon)
                filename = sanitizedId.split(':').pop() || `face-${Date.now()}.jpg`;
            } else {
                filename = `${sanitizedId}.jpg`;
            }

            // Upload the image to S3
            const s3Key = await s3Service.uploadImage(image, targetFolder, filename);

            // Save S3 information in additionalInfo
            if (s3Key) {
                additionalInfo.s3Key = s3Key;
                additionalInfo.s3Folder = targetFolder;
            }

            // Make sure the externalImageId follows our convention if the user hasn't provided one
            if (!externalImageId || !externalImageId.includes(':')) {
                // Create an externalImageId that follows our convention
                if (s3Key) {
                    sanitizedId = convertS3PathToExternalId(s3Key);
                }
            }

            // Index the face in Rekognition
            const command = new IndexFacesCommand({
                CollectionId: collectionId,
                Image: { Bytes: imageBuffer },
                ExternalImageId: sanitizedId,
                DetectionAttributes: detectionAttributes,
            });

            const response = await rekognition.send(command);

            if (response.FaceRecords && response.FaceRecords.length > 0) {
                // Store the face ID with any additional metadata
                const faceId = response.FaceRecords[0].Face?.FaceId;

                if (faceId) {
                    faceMetadata[faceId] = {
                        id: faceId,
                        externalImageId: sanitizedId,
                        additionalInfo: additionalInfo,
                        s3Key: s3Key,
                        collectionId
                    };
                }
            }

            return res.status(201).json({
                faceRecords: response.FaceRecords || [],
                unindexedFaces: response.UnindexedFaces || [],
                s3Key: s3Key,
                externalImageId: sanitizedId
            });
        } catch (error) {
            console.error('Error indexing face:', error);
            return res.status(500).json({ message: 'Error indexing face', error: (error as Error).message });
        }
    }

    // List faces in collection
    if (req.method === 'GET') {
        try {
            const command = new ListFacesCommand({
                CollectionId: collectionId,
                MaxResults: 1000,
            });

            const response = await rekognition.send(command);

            // Determine the S3 folder path for this collection
            let s3FolderPath = COLLECTION_TO_FOLDER_MAP[collectionId];
            if (!s3FolderPath) {
                // Try to find a matching S3 folder
                const rootFolders = await s3Service.listFolders('');
                const matchingFolder = rootFolders.find(folder =>
                    folder.replace(/\/$/, '') === collectionId
                );

                if (matchingFolder) {
                    s3FolderPath = matchingFolder;
                    COLLECTION_TO_FOLDER_MAP[collectionId] = matchingFolder;
                } else {
                    s3FolderPath = collectionId;
                }
            }

            // Get all images in this folder (recursively)
            const s3Images = await s3Service.listAllImagesRecursively(s3FolderPath);

            // Create a map to quickly look up images by externalId or path
            const imageMap = new Map();

            // First, map by externalId
            s3Images.forEach(image => {
                if (image.externalId) {
                    imageMap.set(image.externalId, image);
                }
            });

            // Also map by filename for partial matching
            s3Images.forEach(image => {
                const filename = image.key.split('/').pop() || '';
                if (filename) {
                    imageMap.set(filename, image);
                }
            });

            // Enhance faces with S3 URLs and metadata
            const enhancedFaces = await Promise.all((response.Faces || []).map(async face => {
                const result: any = { ...face };
                let s3Key = null;

                // Try to find matching image using ExternalImageId
                if (face.ExternalImageId) {
                    // Check if we can directly find it by externalId
                    if (imageMap.has(face.ExternalImageId)) {
                        s3Key = imageMap.get(face.ExternalImageId).key;
                    } else {
                        // Try to convert ExternalImageId to S3 path
                        const s3Path = convertExternalIdToS3Path(face.ExternalImageId);

                        // Look for image with this path
                        const matchingImage = s3Images.find(img => img.key === s3Path);
                        if (matchingImage) {
                            s3Key = matchingImage.key;
                        } else {
                            // Try to extract the filename and look for a partial match
                            const parts = face.ExternalImageId.split(':');
                            const filename = parts[parts.length - 1];

                            if (filename && imageMap.has(filename)) {
                                s3Key = imageMap.get(filename).key;
                            }
                        }
                    }
                }

                // If still no match, check metadata
                if (!s3Key && face.FaceId && faceMetadata[face.FaceId]) {
                    s3Key = faceMetadata[face.FaceId].s3Key;
                }

                // If we found an S3 key, get its URL
                if (s3Key) {
                    result.ImageURL = await s3Service.getImageUrl(s3Key);
                }

                // Include any metadata
                if (face.FaceId && faceMetadata[face.FaceId]) {
                    result.Metadata = faceMetadata[face.FaceId];
                }

                return result;
            }));

            return res.status(200).json({
                faces: enhancedFaces,
                nextToken: response.NextToken || null,
                s3Folder: s3FolderPath,
                imageCount: s3Images.length
            });
        } catch (error) {
            console.error('Error listing faces:', error);
            return res.status(500).json({ message: 'Error listing faces', error: (error as Error).message });
        }
    }

    // Delete faces
    if (req.method === 'DELETE') {
        try {
            const { faceIds } = req.body;

            if (!faceIds || !Array.isArray(faceIds) || faceIds.length === 0) {
                return res.status(400).json({ message: 'Face IDs array is required' });
            }

            const command = new DeleteFacesCommand({
                CollectionId: collectionId,
                FaceIds: faceIds,
            });

            const response = await rekognition.send(command);

            // Try to delete associated S3 objects for deleted faces
            const deletedS3Keys: string[] = [];
            for (const faceId of (response.DeletedFaces || [])) {
                if (faceMetadata[faceId] && faceMetadata[faceId].s3Key) {
                    // Delete the image from S3
                    const s3Key = faceMetadata[faceId].s3Key;
                    const deleted = await s3Service.deleteObject(s3Key);
                    if (deleted) {
                        deletedS3Keys.push(s3Key);
                    }

                    // Remove metadata
                    delete faceMetadata[faceId];
                }
            }

            return res.status(200).json({
                deletedFaces: response.DeletedFaces || [],
                deletedS3Objects: deletedS3Keys
            });
        } catch (error) {
            console.error('Error deleting faces:', error);
            return res.status(500).json({ message: 'Error deleting faces', error: (error as Error).message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}