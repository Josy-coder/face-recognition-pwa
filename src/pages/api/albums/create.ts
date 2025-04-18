import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
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

        const { name, description } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Album name is required' });
        }

        // Check if user already has an album with the same name
        const existingAlbum = await prisma.album.findFirst({
            where: {
                ownerId: decodedToken.userId,
                name: name
            }
        });

        if (existingAlbum) {
            return res.status(400).json({ message: 'An album with this name already exists' });
        }

        // Create the album
        const album = await prisma.album.create({
            data: {
                name,
                description: description || '',
                ownerId: decodedToken.userId
            }
        });

        return res.status(201).json({
            message: 'Album created successfully',
            album
        });
    } catch (error) {
        console.error('Error creating album:', error);
        return res.status(500).json({ message: 'Error creating album' });
    }
}
