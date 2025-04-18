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

        // Fetch user's albums
        const albums = await prisma.album.findMany({
            where: {
                ownerId: decodedToken.userId
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