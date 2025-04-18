import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
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

        // Fetch album with people
        const album = await prisma.album.findFirst({
            where: {
                id,
                ownerId: decodedToken.userId
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
