import { NextApiRequest, NextApiResponse } from 'next';
import {
    CreateCollectionCommand,
    ListCollectionsCommand,
    DeleteCollectionCommand
} from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { s3Service } from '@/services/s3-service';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

// Collection to folder mapping - in a production app, store this in a database
const COLLECTION_TO_FOLDER_MAP: Record<string, string> = {};

// Authentication function that checks for bearer token or admin cookie
const getAuthenticatedUser = (req: NextApiRequest) => {
    // Get token from cookies or Authorization header
    const cookies = parseCookies({ req });
    let token = cookies.admin_token;

    // If admin_token is not present, check for auth_token
    if (!token) {
        token = cookies.auth_token;
    }

    // Fallback to Authorization header if no cookie
    if (!token) {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7); // Remove 'Bearer ' prefix
        }
    }

    // If no token found, return null
    if (!token) {
        return null;
    }

    // Verify the token
    try {
        const decoded = verifyToken(token);
        if (!decoded) {
            return null;
        }

        return {
            userId: decoded.userId,
            role: decoded.role
        };
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
};

// Check if the user is an admin
const isAdmin = (user: { userId: string, role: string } | null) => {
    return user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const rekognition = getRekognitionClient();

    // List collections - this can be both authenticated (admin view) or public (for search)
    if (req.method === 'GET') {
        try {
            const command = new ListCollectionsCommand({});
            const response = await rekognition.send(command);
            const collectionIds = response.CollectionIds || [];

            // If this is a public request (has 'public' query param)
            if (req.query.public !== undefined) {
                // Get S3 folder structure for mapping
                const rootFolders = await s3Service.listFolders('');

                // Map collections to folders
                const collectionsWithFolders = await Promise.all(collectionIds.map(async id => {
                    // If we have a predefined mapping, use it
                    if (COLLECTION_TO_FOLDER_MAP[id]) {
                        return {
                            id,
                            folder: COLLECTION_TO_FOLDER_MAP[id]
                        };
                    }

                    // Check if there's a matching S3 folder
                    const matchingFolder = rootFolders.find(folder => {
                        const folderName = folder.replace(/\/$/, ''); // Remove trailing slash
                        return folderName === id || folderName.replace(/[-_]/g, '') === id.replace(/[-_]/g, '');
                    });

                    if (matchingFolder) {
                        // Store the mapping for future use
                        COLLECTION_TO_FOLDER_MAP[id] = matchingFolder;
                        return { id, folder: matchingFolder };
                    }

                    // Default case - use collection ID as folder
                    return { id, folder: id };
                }));

                return res.status(200).json({
                    collections: collectionsWithFolders,
                });
            }
            // If this is an admin request, check authentication
            else {
                // JWT authentication
                const user = getAuthenticatedUser(req);

                // Check if user is admin
                if (!isAdmin(user)) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                // For admin, also get S3 folders and include metadata
                const rootFolders = await s3Service.listFolders('');

                // Enhanced collections with folder info and image counts
                const enhancedCollections = await Promise.all(collectionIds.map(async id => {
                    // Find matching S3 folder
                    const matchingFolder = rootFolders.find(folder => {
                        const folderName = folder.replace(/\/$/, ''); // Remove trailing slash
                        return folderName === id || folderName.replace(/[-_]/g, '') === id.replace(/[-_]/g, '');
                    });

                    const folderPath = matchingFolder || COLLECTION_TO_FOLDER_MAP[id] || id;

                    // Get image count in this folder
                    const images = await s3Service.listImages(folderPath);

                    return {
                        id,
                        folderPath,
                        imageCount: images.length
                    };
                }));

                return res.status(200).json({
                    collections: enhancedCollections,
                    nextToken: response.NextToken || null,
                });
            }
        } catch (error) {
            console.error('Error listing collections:', error);
            return res.status(500).json({ message: 'Error listing collections', error: (error as Error).message });
        }
    }

    // For all other methods, JWT authentication is required
    const user = getAuthenticatedUser(req);

    // Check if user is admin
    if (!isAdmin(user)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create collection
    if (req.method === 'POST') {
        try {
            const { collectionId, folderPath } = req.body;

            if (!collectionId) {
                return res.status(400).json({ message: 'Collection ID is required' });
            }

            // Create the Rekognition collection
            const command = new CreateCollectionCommand({
                CollectionId: collectionId,
            });

            await rekognition.send(command);

            // Create the S3 folder structure
            const s3FolderPath = folderPath || collectionId;
            await s3Service.createFolderStructure(s3FolderPath);

            // Store the collection-to-folder mapping
            COLLECTION_TO_FOLDER_MAP[collectionId] = s3FolderPath;

            return res.status(201).json({
                message: 'Collection created successfully',
                collectionId,
                folderPath: s3FolderPath
            });
        } catch (error) {
            console.error('Error creating collection:', error);
            return res.status(500).json({ message: 'Error creating collection', error: (error as Error).message });
        }
    }

    // Delete collection
    if (req.method === 'DELETE') {
        try {
            const { collectionId } = req.query;

            if (!collectionId || Array.isArray(collectionId)) {
                return res.status(400).json({ message: 'Valid collection ID is required' });
            }

            // Delete the Rekognition collection
            const command = new DeleteCollectionCommand({
                CollectionId: collectionId,
            });

            await rekognition.send(command);

            // Note: We're not deleting the S3 folder contents for safety
            // In a production app, you might want to prompt the user if they want to delete S3 content too

            // Remove from mapping if it exists
            if (COLLECTION_TO_FOLDER_MAP[collectionId]) {
                delete COLLECTION_TO_FOLDER_MAP[collectionId];
            }

            return res.status(200).json({ message: 'Collection deleted successfully', collectionId });
        } catch (error) {
            console.error('Error deleting collection:', error);
            return res.status(500).json({ message: 'Error deleting collection', error: (error as Error).message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}