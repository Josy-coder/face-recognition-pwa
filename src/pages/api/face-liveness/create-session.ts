// pages/api/face-liveness/create-session.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { CreateFaceLivenessSessionCommand } from '@aws-sdk/client-rekognition';
import { getLivenessRekognitionClient } from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Use the Tokyo region client for Face Liveness
        const rekognition = getLivenessRekognitionClient();

        // Create a client request token for idempotency
        const clientRequestToken = uuidv4().replace(/-/g, '');

        // Set up the command with proper parameters according to AWS documentation
        const command = new CreateFaceLivenessSessionCommand({
            ClientRequestToken: clientRequestToken,
            Settings: {
                // Request audit images (0-4, where 0 means no audit images)
                AuditImagesLimit: 2,
                // You can also specify an S3 bucket for storing images if needed
                // OutputConfig: {
                //   S3Bucket: "your-bucket-name",
                //   S3KeyPrefix: "liveness-sessions/"
                // }
            }
        });

        const response = await rekognition.send(command);

        // Return the session ID and token to the client
        return res.status(200).json({
            sessionId: response.SessionId,
            clientToken: clientRequestToken
        });
    } catch (error: any) {
        console.error('Error creating face liveness session:', error);

        // Handle specific error types
        if (error.name === 'AccessDeniedException') {
            return res.status(403).json({
                message: 'Access denied to Face Liveness API',
                error: 'AccessDeniedException'
            });
        } else if (error.name === 'ThrottlingException') {
            return res.status(429).json({
                message: 'Too many requests to Face Liveness API',
                error: 'ThrottlingException'
            });
        } else if (error.name === 'ProvisionedThroughputExceededException') {
            return res.status(429).json({
                message: 'Provisioned throughput exceeded',
                error: 'ProvisionedThroughputExceededException'
            });
        } else if (error.name === 'InvalidParameterException') {
            return res.status(400).json({
                message: 'Invalid parameter provided',
                error: 'InvalidParameterException'
            });
        }

        // Default error response
        return res.status(500).json({
            message: 'Error creating face liveness session',
            error: error.message
        });
    }
}