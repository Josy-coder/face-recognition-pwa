import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function detailsHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { id, userId } = req.query;

        if (!userId || typeof userId !== 'string') {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ message: 'Album ID is required' });
        }

        // Fetch album with people
        const album = await prisma.album.findFirst({
            where: {
                id,
                ownerId: userId
            },
            include: {
                people: true
            }
        });

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        return res.status(200).json({
            album
        });
    } catch (error) {
        console.error('Error fetching album details:', error);
        return res.status(500).json({ message: 'Error fetching album details' });
    }
}
