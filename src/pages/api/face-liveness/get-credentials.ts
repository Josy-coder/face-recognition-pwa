import { NextApiRequest, NextApiResponse } from 'next';
import { STSClient, GetSessionTokenCommand } from '@aws-sdk/client-sts';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Create an STS client
        const stsClient = new STSClient({
            region: process.env.AWS_LIVENESS_REGION || 'ap-northeast-1',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });

        // Using direct credentials with GetSessionToken for temporary credentials
        const command = new GetSessionTokenCommand({
            DurationSeconds: 900, // 15 minutes
        });

        const response = await stsClient.send(command);

        // Return the temporary credentials to the client
        return res.status(200).json({
            credentials: {
                accessKeyId: response.Credentials?.AccessKeyId,
                secretAccessKey: response.Credentials?.SecretAccessKey,
                sessionToken: response.Credentials?.SessionToken,
                expiration: response.Credentials?.Expiration,
            },
            region: process.env.AWS_LIVENESS_REGION || 'ap-northeast-1',
        });
    } catch (error: any) {
        console.error('Error getting temporary credentials:', error);

        // If STS fails, fall back to using direct credentials
        return res.status(200).json({
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                // No session token with direct credentials
                sessionToken: undefined,
                // Set a short expiration
                expiration: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
            },
            region: process.env.AWS_LIVENESS_REGION || 'ap-northeast-1',
        });
    }
}