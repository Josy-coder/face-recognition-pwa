import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get userId directly from the request body
        const {
            userId,
            firstName,
            middleName,
            lastName,
            gender,
            dateOfBirth,
            occupation,
            religion,
            denomination,
            clan,
            nid,
            electorId,
            passport,
            driversLicense,
            residentialPath
        } = req.body;

        // Check if userId is provided - it's required
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Update the user in the database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
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
                nid,
                electorId,
                passport,
                driversLicense,
                residentialPath
            },
            select: {
                id: true,
                email: true,
                firstName: true,
                middleName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                profileImageUrl: true,
                occupation: true,
                religion: true,
                denomination: true,
                clan: true,
                nid: true,
                electorId: true,
                passport: true,
                driversLicense: true,
                residentialPath: true,
                role: true
            }
        });

        return res.status(200).json({
            message: 'Profile updated successfully',
            user: updatedUser
        });
    } catch (error) {
        console.error('Error updating user profile:', error);
        return res.status(500).json({ message: 'Error updating profile' });
    }
}