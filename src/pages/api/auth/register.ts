import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '@/lib/email';
import { s3Service } from '@/services/s3-service';
import { rekognitionService } from '@/services/rekognition-service';
import { convertS3PathToExternalId } from '@/utils/path-conversion';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const {
            email,
            password,
            firstName,
            middleName,
            lastName,
            gender,
            dateOfBirth,
            occupation,
            religion,
            denomination,
            clan,
            residentialPath,
            image,
            collections = ['PNG'] // Default collection
        } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        if (!firstName || !lastName) {
            return res.status(400).json({ message: 'First name and last name are required' });
        }

        if (!image) {
            return res.status(400).json({ message: 'A profile image is required' });
        }

        // Check if email already exists
        const existingUser = await prisma.user.findUnique({
            where: { email }
        });

        if (existingUser) {
            return res.status(400).json({ message: 'Email already registered' });
        }

        // Format the person's name for the filename
        const formattedName = `${firstName}_${lastName}`.replace(/\s+/g, '_');
        const timestamp = Date.now();
        const filename = `${timestamp}_${formattedName}.jpg`;

        // Determine the S3 folder path based on residentialPath or default to a users folder
        let s3FolderPath = 'PNG/Users';
        if (residentialPath) {
            // Convert the residential path format to S3 folder format if needed
            s3FolderPath = residentialPath.replace(/:/g, '/');
        }

        console.log(`Uploading image to S3 path: ${s3FolderPath}/${filename}`);

        // Upload image to S3
        const s3Key = await s3Service.uploadImage(image, s3FolderPath, filename);

        if (!s3Key) {
            return res.status(500).json({ message: 'Failed to upload image to S3' });
        }

        console.log(`Image uploaded to S3 successfully. S3 Key: ${s3Key}`);

        // Create the external image ID for Rekognition
        const externalImageId = convertS3PathToExternalId(s3Key);
        console.log(`Generated externalImageId: ${externalImageId}`);

        // Default faceId
        let faceId = null;

        // Using the primary collection (usually PNG)
        const primaryCollection = collections[0] || 'PNG';

        // Try to index the face in the collection
        try {
            console.log(`Attempting to index face in ${primaryCollection} collection`);

            const indexResult = await rekognitionService.indexFace(
                image,
                primaryCollection,
                externalImageId
            );

            if (indexResult && indexResult.faceRecords && indexResult.faceRecords.length > 0) {
                faceId = indexResult.faceRecords[0].Face?.FaceId;
                console.log(`Face indexed successfully. Face ID: ${faceId}`);
            } else {
                console.warn("No face records returned from indexing");
            }
        } catch (error) {
            console.error("Error indexing face:", error);
            // Continue with registration even if face indexing fails
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');

        // Create user
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                firstName,
                middleName,
                lastName,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                profileImageUrl: s3Key,
                faceId, // This could be null if face indexing failed
                residentialPath,
                verificationToken,
                isEmailVerified: false,
                occupation,
                religion,
                denomination,
                clan
            }
        });

        console.log(`User created successfully. User ID: ${user.id}`);

        // Send verification email
        await sendVerificationEmail(email, verificationToken);
        console.log(`Verification email sent to ${email}`);

        // For debugging: Let's add face info to the response
        return res.status(201).json({
            message: faceId ?
                'User registered successfully. Please check your email to verify your account.' :
                'User registered with image but without face recognition. Please check your email to verify your account.',
            userId: user.id,
            faceIndexed: !!faceId
        });
    } catch (error) {
        console.error('Error in registration API:', error);
        return res.status(500).json({
            message: 'Registration failed',
            error: (error as Error).message
        });
    }
}