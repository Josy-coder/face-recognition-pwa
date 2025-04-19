import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { faceIds } = req.body;

        if (!faceIds || !Array.isArray(faceIds) || faceIds.length === 0) {
            return res.status(400).json({ message: 'Valid faceIds array is required' });
        }

        // Look up people by face IDs
        const people = await prisma.person.findMany({
            where: {
                faceId: {
                    in: faceIds
                }
            }
        });

        // If no people found in Person table, check User table
        if (people.length < faceIds.length) {
            // Find faceIds that weren't matched in the people table
            const foundFaceIds = people.map(person => person.faceId);
            const remainingFaceIds = faceIds.filter(id => !foundFaceIds.includes(id));

            // Look up users with those faceIds
            const users = await prisma.user.findMany({
                where: {
                    faceId: {
                        in: remainingFaceIds
                    }
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
                    faceId: true,
                    occupation: true,
                    religion: true,
                    denomination: true,
                    clan: true,
                    // Include other fields you need
                }
            });

            // Transform user data to match person structure
            const transformedUsers = users.map(user => ({
                ...user,
                isUser: true, // Add a flag to identify this as a user record
                s3ImagePath: user.profileImageUrl
            }));

            // Combine people and users
            return res.status(200).json({
                people: [...people, ...transformedUsers]
            });
        }

        return res.status(200).json({ people });
    } catch (error) {
        console.error('Error fetching person details:', error);
        return res.status(500).json({ message: 'Failed to fetch person details' });
    }
}