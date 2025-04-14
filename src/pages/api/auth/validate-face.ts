import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { SearchFacesByImageCommand } from '@aws-sdk/client-rekognition';
import { getRekognitionClient } from '@/lib/aws-config';
import { loginUser, generateToken } from '@/lib/auth';
import { serialize } from 'cookie';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { image, email } = req.body;

        if (!image) {
            return res.status(400).json({ message: 'Face image is required' });
        }

        // Convert base64 image to buffer
        const buffer = Buffer.from(image.replace(/^data:image\/\w+;base64,/, ''), 'base64');

        // Search for face in the collection
        const rekognition = getRekognitionClient();

        // Use PNG collection for face validation
        const collectionId = 'PNG';

        const command = new SearchFacesByImageCommand({
            CollectionId: collectionId,
            Image: { Bytes: buffer },
            MaxFaces: 1,
            FaceMatchThreshold: 90, // Higher threshold for login security
        });

        const response = await rekognition.send(command);

        // If no face matches found
        if (!response.FaceMatches || response.FaceMatches.length === 0) {
            return res.status(401).json({ message: 'Face not recognized' });
        }

        // Get the matched face
        const matchedFace = response.FaceMatches[0];
        const faceId = matchedFace.Face?.FaceId;

        if (!faceId) {
            return res.status(500).json({ message: 'Face ID not found in match result' });
        }

        // Find user by face ID or email (if provided)
        let user;
        if (email) {
            // If email is provided, verify both face and email match
            user = await prisma.user.findUnique({
                where: { email },
            });

            // Check if the found user has this face ID
            if (user && user.faceId !== faceId) {
                return res.status(401).json({ message: 'Face does not match the provided email account' });
            }
        } else {
            // If only face provided, find user by face ID
            user = await prisma.user.findFirst({
                where: { faceId },
            });
        }

        // If no user found
        if (!user) {
            // Return the face ID so it can be linked to a new account during registration
            return res.status(404).json({
                message: 'No user account associated with this face',
                faceId,
                faceConfidence: matchedFace.Similarity,
                needsRegistration: true
            });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.role);

        // Set JWT token as HttpOnly cookie
        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);

        // Return success with user data
        const { password: _, ...userData } = user;
        return res.status(200).json({
            message: 'Face validation successful',
            user: userData,
        });
    } catch (error) {
        console.error('Error in face validation API:', error);
        return res.status(500).json({ message: 'Face validation failed' });
    }
}