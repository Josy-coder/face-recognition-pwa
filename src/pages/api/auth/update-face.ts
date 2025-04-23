// File: pages/api/auth/update-face.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { getS3Client } from '@/lib/aws-config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import {PrismaClient} from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    // Only accept POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Extract data from the request
    const { image, userId } = req.body;

    // Validate inputs
    if (!image) {
        return res.status(400).json({ message: 'Image is required' });
    }

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
    }



    try {
        // Remove base64 header if present
        const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Generate a unique filename
        const filename = `${Date.now()}_${uuidv4().substring(0, 8)}.jpg`;

        // Define the path in S3 where we'll store user profile photos
        const s3Path = `users/${userId}/${filename}`;

        // Upload to S3
        const s3 = getS3Client();
        const uploadCommand = new PutObjectCommand({
            Bucket: process.env.NEXT_PUBLIC_S3_BUCKET || 'facerecog-app-storage',
            Key: s3Path,
            Body: buffer,
            ContentType: 'image/jpeg',
            ContentEncoding: 'base64'
        });

        await s3.send(uploadCommand);

        // Update user's profile with the new photo
        await prisma.user.update({
            where: { id: userId },
            data: { profileImageUrl: s3Path }
        });

        // Return success and the path to the image
        return res.status(200).json({
            message: 'Profile photo updated successfully',
            profileImageUrl: s3Path
        });
    } catch (error) {
        console.error('Error updating profile photo:', error);
        return res.status(500).json({
            message: 'Error updating profile photo',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}