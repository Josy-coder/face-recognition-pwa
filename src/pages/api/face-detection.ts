import { NextApiRequest, NextApiResponse } from 'next';
import { DetectFacesCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Convert base64 image to Uint8Array
        const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        // Use the standard Sydney region client for face detection
        const rekognition = getRekognitionClient();

        // Configure attribute detection
        const attributes = [
            'DEFAULT'      // Basic face detection
        ];

        const command = new DetectFacesCommand({
            Image: { Bytes: imageBuffer },
            Attributes: attributes,
        });

        const response = await rekognition.send(command);

        return res.status(200).json({
            faceDetails: response.FaceDetails || [],
        });
    } catch (error) {
        console.error('Error detecting faces:', error);
        return res.status(500).json({
            message: 'Error detecting faces',
            error: (error as Error).message
        });
    }
}