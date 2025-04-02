import { Amplify } from 'aws-amplify';
import { cognitoUserPoolsTokenProvider } from 'aws-amplify/auth/cognito';

export const configureAmplify = () => {
    Amplify.configure({
        Auth: {
            Cognito: {
                identityPoolId: process.env.NEXT_PUBLIC_IDENTITY_POOL_ID || '',
                allowGuestAccess: true, // Important for unauthenticated access
            }
        },
        Storage: {
            S3: {
                bucket: process.env.NEXT_PUBLIC_S3_BUCKET,
                region: process.env.NEXT_PUBLIC_AWS_REGION || 'ap-southeast-2',
            }
        }
    });

    // For Cognito Identity Pool without a User Pool
    cognitoUserPoolsTokenProvider.setKeyValueStorage({
        setItem: () => Promise.resolve(),
        getItem: () => Promise.resolve(null),
        removeItem: () => Promise.resolve(),
        clear: () => Promise.resolve(),
    });
};