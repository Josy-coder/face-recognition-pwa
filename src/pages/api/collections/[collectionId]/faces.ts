import { NextApiRequest, NextApiResponse } from 'next';
import {
    IndexFacesCommand,
    ListFacesCommand,
    DeleteFacesCommand
} from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';

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

const faceMetadata: Record<string, unknown> = {};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { collectionId } = req.query;

    if (!collectionId || Array.isArray(collectionId)) {
        return res.status(400).json({ message: 'Valid collection ID is required' });
    }

    // Admin check for POST and DELETE
    if ((req.method === 'POST' || req.method === 'DELETE') && !isAdmin(req)) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    const rekognition = getRekognitionClient();

    // Index a face
    if (req.method === 'POST') {
        try {
            const { image, externalImageId, detectionAttributes = [] } = req.body;

            if (!image) {
                return res.status(400).json({ message: 'Image is required' });
            }

            // Validate externalImageId - AWS requires alphanumeric characters, 
            // underscores, hyphens, periods, and colons only
            if (externalImageId && !/^[a-zA-Z0-9_\-.:%]+$/.test(externalImageId)) {
                return res.status(400).json({
                    message: 'Invalid externalImageId. Must contain only alphanumeric characters, underscores, hyphens, periods, and colons.'
                });
            }

            // Convert base64 image to Uint8Array
            const imageBuffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

            // Store extended metadata if provided
            let metadataId = externalImageId;
            if (!metadataId) {
                // Generate a timestamp-based ID if none provided
                metadataId = `face-${Date.now()}`;
            }

            const command = new IndexFacesCommand({
                CollectionId: collectionId,
                Image: { Bytes: imageBuffer },
                ExternalImageId: metadataId,
                DetectionAttributes: detectionAttributes,
            });

            const response = await rekognition.send(command);

            if (response.FaceRecords && response.FaceRecords.length > 0) {
                // Store the face ID with any additional metadata
                const faceId = response.FaceRecords[0].Face?.FaceId;

                if (faceId) {
                    faceMetadata[faceId] = {
                        id: faceId,
                        externalImageId: metadataId,
                        additionalInfo: req.body.additionalInfo || {},
                        collectionId
                    };
                }
            }

            return res.status(201).json({
                faceRecords: response.FaceRecords || [],
                unindexedFaces: response.UnindexedFaces || [],
            });
        } catch (error) {
            console.error('Error indexing face:', error);
            return res.status(500).json({ message: 'Error indexing face', error: (error as Error).message });
        }
    }

    // List faces in collection
    if (req.method === 'GET') {
        try {
            const command = new ListFacesCommand({
                CollectionId: collectionId,
                MaxResults: 100,
            });

            const response = await rekognition.send(command);

            // Enhance the response with any stored metadata
            const enhancedFaces = (response.Faces || []).map(face => {
                if (face.FaceId && faceMetadata[face.FaceId]) {
                    return {
                        ...face,
                        EnhancedMetadata: faceMetadata[face.FaceId]
                    };
                }
                return face;
            });

            return res.status(200).json({
                faces: enhancedFaces,
                nextToken: response.NextToken || null,
            });
        } catch (error) {
            console.error('Error listing faces:', error);
            return res.status(500).json({ message: 'Error listing faces', error: (error as Error).message });
        }
    }

    // Delete faces
    if (req.method === 'DELETE') {
        try {
            const { faceIds } = req.body;

            if (!faceIds || !Array.isArray(faceIds) || faceIds.length === 0) {
                return res.status(400).json({ message: 'Face IDs array is required' });
            }

            const command = new DeleteFacesCommand({
                CollectionId: collectionId,
                FaceIds: faceIds,
            });

            const response = await rekognition.send(command);

            // Remove metadata for deleted faces
            (response.DeletedFaces || []).forEach(faceId => {
                if (faceMetadata[faceId]) {
                    delete faceMetadata[faceId];
                }
            });

            return res.status(200).json({
                deletedFaces: response.DeletedFaces || [],
            });
        } catch (error) {
            console.error('Error deleting faces:', error);
            return res.status(500).json({ message: 'Error deleting faces', error: (error as Error).message });
        }
    }

    return res.status(405).json({ message: 'Method not allowed' });
}