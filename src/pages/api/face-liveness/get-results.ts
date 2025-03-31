// pages/api/face-liveness/get-result.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { GetFaceLivenessSessionResultsCommand } from '@aws-sdk/client-rekognition';
import { getLivenessRekognitionClient } from '@/lib/aws-config';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Get the session ID from the query parameters
    const { sessionId } = req.query;

    if (!sessionId || Array.isArray(sessionId)) {
        return res.status(400).json({ message: 'Valid session ID is required' });
    }

    try {
        // Use the Tokyo region client for Face Liveness
        const rekognition = getLivenessRekognitionClient();

        // Get the results of the face liveness session
        const command = new GetFaceLivenessSessionResultsCommand({
            SessionId: sessionId
        });

        const response = await rekognition.send(command);

        // Convert binary image data to base64 for frontend
        let referenceImageBase64 = null;
        if (response.ReferenceImage?.Bytes) {
            // Convert UInt8Array to base64
            const binaryStr = Buffer.from(response.ReferenceImage.Bytes).toString('base64');
            referenceImageBase64 = `data:image/jpeg;base64,${binaryStr}`;
        }

        // Convert audit images to base64 if they exist
        const auditImagesBase64 = [];
        if (response.AuditImages && response.AuditImages.length > 0) {
            for (const image of response.AuditImages) {
                if (image.Bytes) {
                    const binaryStr = Buffer.from(image.Bytes).toString('base64');
                    auditImagesBase64.push({
                        imageData: `data:image/jpeg;base64,${binaryStr}`,
                        boundingBox: image.BoundingBox
                    });
                }
            }
        }

        // Return the results to the client
        return res.status(200).json({
            status: response.Status,
            confidence: response.Confidence,
            referenceImage: referenceImageBase64 ? {
                imageData: referenceImageBase64,
                boundingBox: response.ReferenceImage?.BoundingBox
            } : null,
            auditImages: auditImagesBase64,
            sessionId: response.SessionId
        });
    } catch (error: any) {
        console.error('Error getting face liveness session results:', error);

        // Handle specific error types
        if (error.name === 'AccessDeniedException') {
            return res.status(403).json({
                message: 'Access denied to Face Liveness API',
                error: 'AccessDeniedException'
            });
        } else if (error.name === 'ResourceNotFoundException' || error.name === 'SessionNotFoundException') {
            return res.status(404).json({
                message: 'Face liveness session not found',
                error: 'SessionNotFoundException'
            });
        } else if (error.name === 'InvalidParameterException') {
            return res.status(400).json({
                message: 'Invalid parameter provided',
                error: 'InvalidParameterException'
            });
        } else if (error.name === 'SessionExpiredException') {
            return res.status(410).json({
                message: 'Face liveness session has expired',
                error: 'SessionExpiredException'
            });
        }

        // Default error response
        return res.status(500).json({
            message: 'Error getting face liveness session results',
            error: error.message
        });
    }
}