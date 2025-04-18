import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
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
            return res.status(400).json({ message: 'Album ID is required' });
        }

        // Check if album exists and belongs to the user
        const album = await prisma.album.findFirst({
            where: {
                id,
                ownerId: decodedToken.userId
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