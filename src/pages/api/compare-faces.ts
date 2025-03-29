import { NextApiRequest, NextApiResponse } from 'next';
import { CompareFacesCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { sourceImage, targetImage, similarityThreshold = 70 } = req.body;

        if (!sourceImage || !targetImage) {
            return res.status(400).json({ message: 'Source and target images are required' });
        }

        // Convert base64 images to Uint8Array
        const sourceBuffer = Buffer.from(sourceImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');
        const targetBuffer = Buffer.from(targetImage.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        const rekognition = getRekognitionClient();

        const params = {
            SourceImage: { Bytes: sourceBuffer },
            TargetImage: { Bytes: targetBuffer },
            SimilarityThreshold: similarityThreshold,
        };

        const command = new CompareFacesCommand(params);
        const response = await rekognition.send(command);

        return res.status(200).json({
            faceMatches: response.FaceMatches || [],
            unmatchedFaces: response.UnmatchedFaces || [],
            sourceImageFace: response.SourceImageFace || null,
        });
    } catch (error) {
        console.error('Error comparing faces:', error);
        return res.status(500).json({ message: 'Error comparing faces', error: (error as Error).message });
    }
}