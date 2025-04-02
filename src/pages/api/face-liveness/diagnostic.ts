import { NextApiRequest, NextApiResponse } from 'next';
import { CreateFaceLivenessSessionCommand } from '@aws-sdk/client-rekognition';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { getLivenessRekognitionClient } from '@/lib/aws-config';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    const diagnosticResults = {
        timestamp: new Date().toISOString(),
        aws: {
            region: process.env.AWS_LIVENESS_REGION || 'ap-northeast-1',
            identity: {
                status: 'pending',
                accountId: null,
                error: null
            },
            liveness: {
                status: 'pending',
                sessionId: null,
                error: null
            }
        },
        environment: {
            nodeEnv: process.env.NODE_ENV,
            hasAwsCredentials: !!process.env.AWS_ACCESS_KEY_ID && !!process.env.AWS_SECRET_ACCESS_KEY,
            livenessRegion: process.env.AWS_LIVENESS_REGION || 'ap-northeast-1',
        }
    };

    // Test AWS identity (to check if credentials are valid)
    try {
        console.log('Testing AWS Identity...');
        const stsClient = new STSClient({
            region: process.env.AWS_REGION || 'ap-southeast-2',
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
            },
        });

        const identityCommand = new GetCallerIdentityCommand({});
        const identityResponse = await stsClient.send(identityCommand);

        diagnosticResults.aws.identity = {
            status: 'success',
            accountId: identityResponse.Account,
            error: null
        };
        console.log('AWS Identity check succeeded:', identityResponse.Account);
    } catch (error: any) {
        console.error('Diagnostic AWS identity error:', error);
        diagnosticResults.aws.identity = {
            status: 'error',
            accountId: null,
            error: {
                name: error.name,
                message: error.message
            }
        };
    }

    // Test Face Liveness API
    try {
        console.log('Testing Face Liveness API...');
        const rekognition = getLivenessRekognitionClient();

        // Generate a client request token
        const clientRequestToken = uuidv4().replace(/-/g, '');

        // Create a test liveness session
        const livenessCommand = new CreateFaceLivenessSessionCommand({
            ClientRequestToken: clientRequestToken,
            Settings: {
                AuditImagesLimit: 0 // No audit images needed for diagnostic
            }
        });

        const livenessResponse = await rekognition.send(livenessCommand);
        console.log('Face Liveness test session created:', livenessResponse.SessionId);

        diagnosticResults.aws.liveness = {
            status: 'success',
            sessionId: livenessResponse.SessionId,
            error: null
        };
    } catch (error: any) {
        console.error('Diagnostic Face Liveness error:', error);
        diagnosticResults.aws.liveness = {
            status: 'error',
            sessionId: null,
            error: {
                name: error.name,
                message: error.message
            }
        };
    }

    // Return diagnostic results
    return res.status(200).json(diagnosticResults);
}