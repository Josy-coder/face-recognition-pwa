import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
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

        // Get the updated user data from request body
        const {
            firstName,
            middleName,
            lastName,
            gender,
            dateOfBirth,
            residentialPath
        } = req.body;

        // Update the user in the database
        const updatedUser = await prisma.user.update({
            where: { id: decodedToken.userId },
            data: {
                firstName,
                middleName,
                lastName,
                gender,
                dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
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