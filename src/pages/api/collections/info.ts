import { NextApiRequest, NextApiResponse } from 'next';
import { ListFacesCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { collectionId } = req.query;

        if (!collectionId || Array.isArray(collectionId)) {
            return res.status(400).json({ message: 'Valid collection ID is required' });
        }

        const rekognition = getRekognitionClient();

        // Get faces count for the collection
        const command = new ListFacesCommand({
            CollectionId: collectionId,
            MaxResults: 1, // We only need the count, not the actual faces
        });

        const response = await rekognition.send(command);

        return res.status(200).json({
            collectionId,
            faceCount: response.Faces?.length || 0,
            faceModelVersion: response.FaceModelVersion
        });
    } catch (error) {
        console.error('Error getting collection info:', error);

        // Handle case where collection doesn't exist
        if ((error as any).name === 'ResourceNotFoundException') {
            return res.status(404).json({
                message: 'Collection not found',
                collectionId: req.query.collectionId,
                faceCount: 0
            });
        }

        return res.status(500).json({
            message: 'Error getting collection info',
            error: (error as Error).message
        });
    }
}