import { NextApiRequest, NextApiResponse } from 'next';
import {
    CreateCollectionCommand,
    ListCollectionsCommand,
    DeleteCollectionCommand
} from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

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

// Collection to folder mapping - in a production app, store this in a database
const COLLECTION_TO_FOLDER_MAP: Record<string, string> = {};

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
                // Map collections to folders for public use
                const collectionsWithFolders = collectionIds.map(id => {
                    // If we have a predefined mapping, use it
                    if (COLLECTION_TO_FOLDER_MAP[id]) {
                        return {
                            id,
                            folder: COLLECTION_TO_FOLDER_MAP[id]
                        };
                    }

                    // Otherwise create a folder path based on collection ID
                    let folder = id;

                    // Replace common collection name patterns with folder paths
                    if (id.endsWith('-collection')) {
                        folder = id.replace('-collection', '');
                    }

                    // Handle departmental collections
                    if (folder.includes('engineering')) {
                        return { id, folder: 'Employees/Engineering' };
                    } else if (folder.includes('marketing')) {
                        return { id, folder: 'Employees/Marketing' };
                    } else if (folder.includes('sales')) {
                        return { id, folder: 'Employees/Sales' };
                    } else if (folder.includes('employees')) {
                        return { id, folder: 'Employees' };
                    } else if (folder.includes('enterprise')) {
                        return { id, folder: 'Customers/Enterprise' };
                    } else if (folder.includes('smb')) {
                        return { id, folder: 'Customers/SMB' };
                    } else if (folder.includes('customers')) {
                        return { id, folder: 'Customers' };
                    } else if (folder.includes('2023')) {
                        return { id, folder: 'Events/2023' };
                    } else if (folder.includes('2024')) {
                        return { id, folder: 'Events/2024' };
                    } else if (folder.includes('events')) {
                        return { id, folder: 'Events' };
                    } else if (folder.includes('visitors')) {
                        return { id, folder: 'Visitors' };
                    }

                    // Default case - use collection ID as folder
                    return { id, folder };
                });

                return res.status(200).json({
                    collections: collectionsWithFolders,
                });
            }
            // If this is an admin request, check authentication
            else {
                // Admin authentication for admin operations
                if (!isAdmin(req)) {
                    return res.status(401).json({ message: 'Unauthorized' });
                }

                return res.status(200).json({
                    collections: collectionIds,
                    nextToken: response.NextToken || null,
                });
            }
        } catch (error) {
            console.error('Error listing collections:', error);
            return res.status(500).json({ message: 'Error listing collections', error: (error as Error).message });
        }
    }

    // For all other methods, admin authentication is required
    if (!isAdmin(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Create collection
    if (req.method === 'POST') {
        try {
            const { collectionId, folderPath } = req.body;

            if (!collectionId) {
                return res.status(400).json({ message: 'Collection ID is required' });
            }

            const command = new CreateCollectionCommand({
                CollectionId: collectionId,
            });

            await rekognition.send(command);

            // Store the collection-to-folder mapping if provided
            if (folderPath) {
                COLLECTION_TO_FOLDER_MAP[collectionId] = folderPath;
            }

            return res.status(201).json({ message: 'Collection created successfully', collectionId });
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

            const command = new DeleteCollectionCommand({
                CollectionId: collectionId,
            });

            await rekognition.send(command);

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