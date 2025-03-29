import { NextApiRequest, NextApiResponse } from 'next';
import { SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { image, collectionId, maxFaces = 10, faceMatchThreshold = 70 } = req.body;

        if (!image || !collectionId) {
            return res.status(400).json({ message: 'Image and collection ID are required' });
        }

        // Convert base64 image to Uint8Array
        const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const rekognition = getRekognitionClient();

        const params = {
            CollectionId: collectionId,
            Image: { Bytes: imageBuffer },
            MaxFaces: maxFaces,
            FaceMatchThreshold: faceMatchThreshold,
        };

        const command = new SearchFacesByImageCommand(params);
        const response = await rekognition.send(command);

        return res.status(200).json({
            searchedFaceBoundingBox: response.SearchedFaceBoundingBox || null,
            searchedFaceConfidence: response.SearchedFaceConfidence || null,
            faceMatches: response.FaceMatches || [],
        });
    } catch (error) {
        console.error('Error searching faces:', error);
        return res.status(500).json({ message: 'Error searching faces', error: (error as Error).message });
    }
}