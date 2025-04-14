import { NextApiRequest, NextApiResponse } from 'next';
import { s3Service } from '@/services/s3-service';

// This handler provides location data based on S3 folder structure
async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { collection, level } = req.query as { collection: string, level: string };

    // Optional query parameters for filtering
    const { prefix } = req.query as { prefix?: string };

    try {
        // Validate collection
        if (!['PNG', 'ABG', 'MKA'].includes(collection)) {
            return res.status(400).json({ message: 'Invalid collection' });
        }

        // Base path is the collection
        const basePath = collection;

        // Full path includes the prefix if one is provided
        const fullPath = prefix ? `${basePath}/${prefix}` : basePath;

        // Get all folders at this level
        const folders = await s3Service.listFolders(fullPath);

        // Format folder names as location options
        const options = folders.map(folder => {
            // Extract just the folder name from the path
            const pathParts = folder.split('/');
            const folderName = pathParts[pathParts.length - 2] || folder;

            return {
                value: folder, // Full path value
                label: folderName, // Just the folder name for display
                path: folder // Full path for reference
            };
        });

        // Return different responses based on the level requested
        switch (level) {
            case 'provinces':
                return res.status(200).json({ provinces: options });
            case 'districts':
                return res.status(200).json({ districts: options });
            case 'llgs':
                return res.status(200).json({ llgs: options });
            case 'wards':
                return res.status(200).json({ wards: options });
            case 'locations':
                return res.status(200).json({ locations: options });
            case 'subfolders':
                // Generic subfolders endpoint
                return res.status(200).json({
                    subfolders: options,
                    parentPath: fullPath
                });
            default:
                return res.status(400).json({ message: 'Invalid location level' });
        }
    } catch (error) {
        console.error(`Error in locations API [${collection}/${level}]:`, error);
        return res.status(500).json({ message: 'Error fetching location data' });
    }
}

export default handler;