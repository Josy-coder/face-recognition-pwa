import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';
import { rekognitionService } from '@/services/rekognition-service';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get token from cookies
        const cookies = parseCookies({ req });
        const token = cookies.auth_token;

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Not logged in' });
        }

        // Verify token
        const decodedToken = verifyToken(token);

        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        // Get the image from request body
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({ message: 'Image is required' });
        }

        // Find the user to get their faceId
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId },
            select: {
                id: true,
                faceId: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.faceId) {
            return res.status(400).json({ message: 'User has no face ID registered' });
        }

        // Use the rekognition service to compare faces
        const comparisonResult = await rekognitionService.compareFaceToFaceId(
            image,
            user.faceId,
            70 // 70% similarity threshold
        );

        if (!comparisonResult || !comparisonResult.matched) {
            return res.status(403).json({ message: 'Face verification failed' });
        }

        // If we get here, the face matches
        return res.status(200).json({
            message: 'Face verified successfully',
            similarity: comparisonResult.similarity || 0
        });
    } catch (error) {
        console.error('Error verifying user face:', error);
        return res.status(500).json({ message: 'Error verifying face' });
    }
}