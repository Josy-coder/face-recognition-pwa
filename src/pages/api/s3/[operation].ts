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
    const { operation } = req.query;

    // For security, require admin auth for write operations
    if (['upload', 'create-folder', 'batch-upload', 'delete-object'].includes(operation as string) && !isAdmin(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    switch (operation) {
        case 'list-folders': {
            const { prefix } = req.query;
            const folders = await s3Service.listFolders(
                Array.isArray(prefix) ? prefix[0] : prefix || ''
            );
            return res.status(200).json({ folders });
        }

        case 'list-images': {
            const { path } = req.query;
            const imageList = await s3Service.listImages(
                Array.isArray(path) ? path[0] : path || ''
            );
            return res.status(200).json({ images: imageList });
        }

        case 'create-folder': {
            if (req.method !== 'POST') {
                return res.status(405).json({ message: 'Method not allowed' });
            }

            const { folderPath } = req.body;

            if (!folderPath) {
                return res.status(400).json({ message: 'Folder path is required' });
            }

            const created = await s3Service.createFolderStructure(folderPath);

            if (created) {
                return res.status(201).json({ message: 'Folder structure created successfully', path: folderPath });
            } else {
                return res.status(500).json({ message: 'Failed to create folder structure' });
            }
        }

        case 'upload': {
            if (req.method !== 'POST') {
                return res.status(405).json({ message: 'Method not allowed' });
            }

            const { imageData, folder: uploadFolder, fileName } = req.body;

            if (!imageData || !fileName) {
                return res.status(400).json({ message: 'Image data and file name are required' });
            }

            const imagePath = await s3Service.uploadImage(imageData, uploadFolder || '', fileName);

            if (imagePath) {
                return res.status(201).json({ path: imagePath });
            } else {
                return res.status(500).json({ message: 'Failed to upload image' });
            }
        }

        case 'batch-upload': {
            if (req.method !== 'POST') {
                return res.status(405).json({ message: 'Method not allowed' });
            }

            const { images: imagesList, folder: batchFolder } = req.body;

            if (!imagesList || !Array.isArray(imagesList) || imagesList.length === 0) {
                return res.status(400).json({ message: 'Images array is required' });
            }

            const uploadedPaths = await s3Service.batchUploadImages(imagesList, batchFolder || '');

            return res.status(201).json({
                message: `Successfully uploaded ${uploadedPaths.length} of ${imagesList.length} images`,
                paths: uploadedPaths
            });
        }

        case 'get-url': {
            const { key } = req.query;

            if (!key) {
                return res.status(400).json({ message: 'Image key is required' });
            }

            const url = await s3Service.getImageUrl(
                Array.isArray(key) ? key[0] : key
            );

            if (url) {
                return res.status(200).json({ url });
            } else {
                return res.status(404).json({ message: 'Image not found or URL could not be generated' });
            }
        }

        case 'delete-object': {
            if (req.method !== 'DELETE') {
                return res.status(405).json({ message: 'Method not allowed' });
            }

            const { objectKey } = req.body;

            if (!objectKey) {
                return res.status(400).json({ message: 'Object key is required' });
            }

            const deleted = await s3Service.deleteObject(objectKey);

            if (deleted) {
                return res.status(200).json({ message: 'Object deleted successfully' });
            } else {
                return res.status(500).json({ message: 'Failed to delete object' });
            }
        }

        default:
            return res.status(400).json({ message: 'Invalid operation' });
    }
}