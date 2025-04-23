import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { userId } = req.query;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Fetch people registered by the user
        const people = await prisma.person.findMany({
            where: {
                registeredById: userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            people
        });
    } catch (error) {
        console.error('Error fetching registered people:', error);
        return res.status(500).json({ message: 'Error fetching registered people' });
    }
}