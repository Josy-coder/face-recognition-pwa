import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';
import { s3Service } from '@/services/s3-service';
import { rekognitionService } from '@/services/rekognition-service';
import { convertS3PathToExternalId } from '@/utils/path-conversion';

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

        // Validate user existence
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId }
        });

        if (!user) {
            return res.status(401).json({ message: 'Unauthorized: User not found' });
        }

        // Get request data
        const {
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
            albumId,
            image
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !image || !albumId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Verify album belongs to the user
        const album = await prisma.album.findFirst({
            where: {
                id: albumId,
                ownerId: user.id
            }
        });

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Format the person's name for the filename
        const formattedName = `${firstName}_${lastName}`.replace(/\s+/g, '_');
        const timestamp = Date.now();
        const filename = `${timestamp}_${formattedName}.jpg`;

        // Determine the S3 folder path based on residentialPath or default to PNG collection
        let s3FolderPath = 'PNG';
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

        // Index face in Rekognition - FIXED: using the image data instead of S3 key
        console.log(`Indexing face in collection: PNG with externalImageId: ${externalImageId}`);
        const indexResult = await rekognitionService.indexFace(
            image,  // Pass the image data, not the S3 key
            'PNG',  // Collection ID
            externalImageId  // External image ID
        );

        if (!indexResult || !indexResult.faceRecords || indexResult.faceRecords.length === 0) {
            console.error('Failed to index face:', indexResult);
            return res.status(500).json({ message: 'Failed to index face in Rekognition' });
        }

        // Get the faceId from the indexing result
        const faceId = indexResult.faceRecords[0].Face?.FaceId;

        if (!faceId) {
            return res.status(500).json({ message: 'No face ID returned from Rekognition' });
        }

        console.log(`Face indexed successfully. Face ID: ${faceId}`);

        // Create person in database
        const person = await prisma.person.create({
            data: {
                firstName,
                middleName,
                lastName,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
                occupation,
                religion,
                denomination,
                clan,
                faceId: faceId,
                externalImageId,
                s3ImagePath: s3Key,
                residentialPath,
                pathType: 'PNG', // Default to PNG collection as per feedback
                registeredById: user.id,
                albumId
            }
        });

        return res.status(201).json({
            message: 'Person registered successfully',
            person
        });
    } catch (error) {
        console.error('Error registering person:', error);
        return res.status(500).json({
            message: 'Error registering person',
            error: (error as Error).message
        });
    }
}