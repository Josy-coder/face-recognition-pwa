import { NextApiRequest, NextApiResponse } from 'next';
import { CreateFaceLivenessSessionCommand } from '@aws-sdk/client-rekognition';
import { getLivenessRekognitionClient } from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Use the appropriate region client for Face Liveness
        const rekognition = getLivenessRekognitionClient();

        // Create a client request token for idempotency
        const clientRequestToken = uuidv4().replace(/-/g, '');

        // Settings for better liveness detection
        const settings = {
            // Request audit images (0-4, where 0 means no audit images)
            AuditImagesLimit: 2,
            // Optionally configure S3 storage if you want to store images
            // OutputConfig: {
            //     S3Bucket: process.env.AWS_LIVENESS_S3_BUCKET,
            //     S3KeyPrefix: "liveness-sessions/"
            // }
        };

        // Set up the command with proper parameters according to AWS documentation
        const command = new CreateFaceLivenessSessionCommand({
            ClientRequestToken: clientRequestToken,
            Settings: settings
        });

        console.log('Creating Face Liveness session...');
        const response = await rekognition.send(command);
        console.log('Session created:', response);

        // Return the session ID to the client
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