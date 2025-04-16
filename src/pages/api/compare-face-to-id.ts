import { NextApiRequest, NextApiResponse } from 'next';
import {
    ListCollectionsCommand,
    SearchFacesByImageCommand,
    SearchFacesByImageCommandOutput
} from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { sourceImage, faceId, similarityThreshold = 70 } = req.body;

        if (!sourceImage) {
            return res.status(400).json({ message: 'Source image is required' });
        }

        if (!faceId) {
            return res.status(400).json({ message: 'Face ID is required' });
        }

        // Get the Rekognition client
        const rekognition = getRekognitionClient();

        // Process the base64 image
        const imageData = sourceImage.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(imageData, 'base64');

        // Search for faces in all collections (we can optimize this if we know the collection)
        // Get a list of collections to search
        const listCollectionsCommand = new ListCollectionsCommand({});
        const collectionsResponse = await rekognition.send(listCollectionsCommand);
        const collectionIds = collectionsResponse.CollectionIds || [];

        let bestMatch = null;
        let highestSimilarity = 0;

        // Search each collection for the face ID
        for (const collectionId of collectionIds) {
            try {
                const command = new SearchFacesByImageCommand({
                    CollectionId: collectionId,
                    Image: {
                        Bytes: buffer
                    },
                    MaxFaces: 10,
                    FaceMatchThreshold: similarityThreshold
                });

                const response: SearchFacesByImageCommandOutput = await rekognition.send(command);

                // Check if any of the matched faces have the target faceId
                const matchedFace = response.FaceMatches?.find(match => match.Face?.FaceId === faceId);

                if (matchedFace && matchedFace.Similarity && matchedFace.Similarity > highestSimilarity) {
                    // Store the matchedFace with the collection ID
                    bestMatch = {
                        ...matchedFace,
                        collectionId // Add the collectionId property
                    };
                    highestSimilarity = matchedFace.Similarity;
                }
            } catch (error) {
                console.error(`Error searching in collection ${collectionId}:`, error);
                // Continue to next collection
            }
        }

        if (bestMatch) {
            return res.status(200).json({
                matched: true,
                similarity: bestMatch.Similarity || 0,
                faceId: bestMatch.Face?.FaceId,
                collectionId: bestMatch.collectionId // This will now be properly defined
            });
        } else {
            return res.status(200).json({
                matched: false,
                similarity: 0,
                message: 'No matching faces found'
            });
        }
    } catch (error) {
        console.error('Error comparing face to ID:', error);
        return res.status(500).json({
            message: 'Error comparing face to ID',
            error: (error as Error).message
        });
    }
}