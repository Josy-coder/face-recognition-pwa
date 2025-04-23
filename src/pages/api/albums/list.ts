import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function listHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { userId } = req.query;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'User ID is required' });
        }

        // Fetch user's albums
        const albums = await prisma.album.findMany({
            where: {
                ownerId: userId
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return res.status(200).json({
            albums
        });
    } catch (error) {
        console.error('Error fetching albums:', error);
        return res.status(500).json({ message: 'Error fetching albums' });
    }
}