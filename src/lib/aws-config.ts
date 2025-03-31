import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { S3Client } from '@aws-sdk/client-s3';

// Define the regions where features are available
const FACE_LIVENESS_REGIONS = [
    'us-east-1',      // N. Virginia
    'us-west-2',      // Oregon
    'eu-west-1',      // Ireland
    'ap-northeast-1', // Tokyo
];

// AWS Configuration for main operations
const createRekognitionClient = () => {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    console.log(`Creating Rekognition client for region: ${region}`);

    return new RekognitionClient({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
};

// Special client for Face Liveness operations
const createLivenessRekognitionClient = () => {
    // Use a specific region for face liveness or default to Tokyo if not specified
    const livenessRegion = process.env.AWS_LIVENESS_REGION || 'ap-northeast-1';

    console.log(`Creating Face Liveness Rekognition client for region: ${livenessRegion}`);

    // Validate that the region supports Face Liveness
    if (!FACE_LIVENESS_REGIONS.includes(livenessRegion)) {
        console.warn(`WARNING: Region ${livenessRegion} may not support Face Liveness. Supported regions are: ${FACE_LIVENESS_REGIONS.join(', ')}`);
    }

    return new RekognitionClient({
        region: livenessRegion,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
        logger: console, // Enable logging for debugging
    });
};

const createS3Client = () => {
    const region = process.env.AWS_REGION || 'ap-southeast-2';
    console.log(`Creating S3 client for region: ${region}`);

    return new S3Client({
        region,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        },
    });
};

// Create singleton instances
let rekognitionClient: RekognitionClient | null = null;
let livenessRekognitionClient: RekognitionClient | null = null;
let s3Client: S3Client | null = null;

export const getRekognitionClient = () => {
    if (!rekognitionClient) {
        rekognitionClient = createRekognitionClient();
    }
    return rekognitionClient;
};

export const getLivenessRekognitionClient = () => {
    if (!livenessRekognitionClient) {
        livenessRekognitionClient = createLivenessRekognitionClient();
    }
    return livenessRekognitionClient;
};

export const getS3Client = () => {
    if (!s3Client) {
        s3Client = createS3Client();
    }
    return s3Client;
};

// Helper function to check if a feature is available in a region
export const isFeatureAvailableInRegion = (
    feature: 'face-liveness' | 'face-detection' | 'face-search',
    region: string
): boolean => {
    switch (feature) {
        case 'face-liveness':
            return FACE_LIVENESS_REGIONS.includes(region);
        case 'face-detection':
        case 'face-search':
            return true; // Available in all regions that support Rekognition
        default:
            return false;
    }
};