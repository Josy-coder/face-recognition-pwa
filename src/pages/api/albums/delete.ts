import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function deleteHandler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
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

        // Check if album exists and belongs to the user
        const album = await prisma.album.findFirst({
            where: {
                id,
                ownerId: userId
            }
        });

        if (!album) {
            return res.status(404).json({ message: 'Album not found' });
        }

        // Delete the album (Prisma cascade will handle the people relationships)
        await prisma.album.delete({
            where: {
                id
            }
        });

        return res.status(200).json({
            message: 'Album deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting album:', error);
        return res.status(500).json({ message: 'Error deleting album' });
    }
}