import { NextApiRequest, NextApiResponse } from 'next';
import { IndexFacesCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { image, collectionId, externalImageId, detectionAttributes = [] } = req.body;

        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        if (!collectionId) {
            return res.status(400).json({ message: 'Collection ID is required' });
        }

        // Convert base64 image to Buffer
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Initialize the Rekognition client
        const rekognition = getRekognitionClient();

        // Create the command for indexing faces
        const command = new IndexFacesCommand({
            CollectionId: collectionId,
            Image: { Bytes: imageBuffer },
            ExternalImageId: externalImageId || undefined,
            DetectionAttributes: detectionAttributes.length > 0 ? detectionAttributes : undefined
        });

        // Send the command to AWS Rekognition
        console.log(`Sending IndexFaces command to AWS Rekognition for collection: ${collectionId}`);
        const response = await rekognition.send(command);
        console.log('IndexFaces response:', JSON.stringify(response, null, 2));

        // Return the response
        return res.status(200).json({
            faceRecords: response.FaceRecords || [],
            unindexedFaces: response.UnindexedFaces || [],
            faceModelVersion: response.FaceModelVersion
        });
    } catch (error) {
        console.error('Error in IndexFaces API:', error);
        return res.status(500).json({
            message: 'Error indexing face',
            error: (error as Error).message
        });
    }
}