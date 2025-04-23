import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { name, description, userId } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        if (!name) {
            return res.status(400).json({ message: 'Album name is required' });
        }

        // Check if user already has an album with the same name
        const existingAlbum = await prisma.album.findFirst({
            where: {
                ownerId: userId,
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
                ownerId: userId
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