import { NextApiRequest, NextApiResponse } from 'next';
import { s3Service } from '@/services/s3-service';

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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // For security, require admin auth
    if (!isAdmin(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const { prefix } = req.query;

        // Get all folders and subfolders
        const allFolders = await s3Service.getAllSubfolders(
            Array.isArray(prefix) ? prefix[0] : prefix || ''
        );

        // Add the root folder to the list if provided
        const rootPrefix = Array.isArray(prefix) ? prefix[0] : prefix || '';
        const foldersToProcess = rootPrefix ? [rootPrefix, ...allFolders] : [...allFolders];

        // Get image counts for each folder
        const folderCounts: Record<string, number> = {};

        // Process in batches for better performance
        const batchSize = 10;
        for (let i = 0; i < foldersToProcess.length; i += batchSize) {
            const batch = foldersToProcess.slice(i, i + batchSize);

            // Process batch in parallel
            const results = await Promise.all(
                batch.map(async (folder) => {
                    const images = await s3Service.listImages(folder);
                    return { folder, count: images.length };
                })
            );

            // Add results to our counts
            results.forEach(({ folder, count }) => {
                folderCounts[folder] = count;
            });
        }

        // Get folder hierarchy for better UI presentation
        const hierarchy = await s3Service.getFolderHierarchyWithImageCounts(rootPrefix);

        return res.status(200).json({
            folderCounts,
            hierarchy
        });
    } catch (error) {
        console.error('Error getting folder statistics:', error);
        return res.status(500).json({ message: 'Error getting folder statistics', error: (error as Error).message });
    }
}