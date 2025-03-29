import { RekognitionClient } from '@aws-sdk/client-rekognition';

// AWS Configuration
const createRekognitionClient = () => {
    return new RekognitionClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
};

// Create a singleton instance
let rekognitionClient: RekognitionClient | null = null;

export const getRekognitionClient = () => {
    if (!rekognitionClient) {
        rekognitionClient = createRekognitionClient();
    }
    return rekognitionClient;
};