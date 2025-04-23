import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
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
            image,
            userId  // Get userId from request body
        } = req.body;

        // Validate required fields
        if (!firstName || !lastName || !image || !albumId || !userId) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Verify album belongs to the user
        const album = await prisma.album.findFirst({
            where: {
                id: albumId,
                ownerId: userId
            }
        });

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Format name and create filename
        const formattedName = `${firstName}_${lastName}`.replace(/\s+/g, '_');
        const timestamp = Date.now();
        const filename = `${timestamp}_${formattedName}.jpg`;

        // Determine S3 folder path
        let s3FolderPath = 'PNG';
        if (residentialPath) {
            s3FolderPath = residentialPath.replace(/:/g, '/');
        }

        // Upload image to S3
        const s3Key = await s3Service.uploadImage(image, s3FolderPath, filename);

        if (!s3Key) {
            return res.status(500).json({ message: 'Failed to upload image to S3' });
        }

        // Create external image ID for Rekognition
        const externalImageId = convertS3PathToExternalId(s3Key);

        // Index face in Rekognition
        const indexResult = await rekognitionService.indexFace(
            image,
            'PNG',
            externalImageId
        );

        if (!indexResult?.faceRecords?.[0]?.Face?.FaceId) {
            return res.status(500).json({ message: 'Failed to index face in Rekognition' });
        }

        const faceId = indexResult.faceRecords[0].Face.FaceId;

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
                faceId,
                externalImageId,
                s3ImagePath: s3Key,
                residentialPath,
                pathType: 'PNG',
                registeredById: userId,
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