import { NextApiRequest, NextApiResponse } from 'next';
import { DescribeCollectionCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { s3Service } from '@/services/s3-service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const { collectionId } = req.query;

    if (!collectionId || Array.isArray(collectionId)) {
        return res.status(400).json({ message: 'Valid collection ID is required' });
    }

    try {
        const rekognition = getRekognitionClient();

        // Use DescribeCollection to get accurate metadata including face count
        const command = new DescribeCollectionCommand({
            CollectionId: collectionId
        });

        const response = await rekognition.send(command);

        // Find corresponding S3 folder for this collection
        const rootFolders = await s3Service.listFolders('');
        let s3FolderPath = collectionId;

        // Try to find an exact match first
        const exactMatch = rootFolders.find(folder =>
            folder.replace(/\/$/, '') === collectionId
        );

        if (exactMatch) {
            s3FolderPath = exactMatch;
        } else {
            // Try partial matching if no exact match
            const partialMatch = rootFolders.find(folder => {
                const folderName = folder.replace(/\/$/, ''); // Remove trailing slash
                return folderName.toLowerCase() === collectionId.toLowerCase() ||
                    folderName.replace(/[-_]/g, '').toLowerCase() === collectionId.replace(/[-_]/g, '').toLowerCase();
            });

            if (partialMatch) {
                s3FolderPath = partialMatch;
            }
        }

        // Get folder hierarchy with image counts
        const folderHierarchy = await s3Service.getFolderHierarchyWithImageCounts(s3FolderPath);

        // Get total image count in S3 folder
        const s3ImageCount = (await s3Service.listAllImagesRecursively(s3FolderPath)).length;

        return res.status(200).json({
            collectionId,
            faceCount: response.FaceCount || 0,
            s3ImageCount,
            faceModelVersion: response.FaceModelVersion,
            creationTimestamp: response.CreationTimestamp,
            collectionARN: response.CollectionARN,
            s3Folder: s3FolderPath,
            folderHierarchy
        });
    } catch (error) {
        console.error('Error getting collection info:', error);

        // Handle case where collection doesn't exist
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((error as any).name === 'ResourceNotFoundException') {
            return res.status(404).json({
                message: 'Collection not found',
                collectionId,
                faceCount: 0
            });
        }

        return res.status(500).json({
            message: 'Error getting collection info',
            error: (error as Error).message
        });
    }
}