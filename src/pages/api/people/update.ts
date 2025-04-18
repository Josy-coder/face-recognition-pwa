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

        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'Person ID is required' });
        }

        // Get update data
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
            residentialPath
        } = req.body;

        // Verify the person exists and was registered by this user
        const existingPerson = await prisma.person.findFirst({
            where: {
                id,
                registeredById: decodedToken.userId
            }
        });

        if (!existingPerson) {
            return res.status(404).json({ message: 'Person not found or not registered by you' });
        }

        // Update person
        const updatedPerson = await prisma.person.update({
            where: { id },
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
                residentialPath
            }
        });

        return res.status(200).json({
            message: 'Person updated successfully',
            person: updatedPerson
        });
    } catch (error) {
        console.error('Error updating person:', error);
        return res.status(500).json({ message: 'Error updating person' });
    }
}