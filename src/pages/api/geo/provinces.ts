import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { regionId } = req.query;

        if (!regionId || typeof regionId !== 'string') {
            return res.status(400).json({ message: 'Region ID is required' });
        }

        // Fetch provinces for the specified region
        const provinces = await prisma.province.findMany({
            where: { geoRegionId: regionId },
            orderBy: { name: 'asc' }
        });

        return res.status(200).json({ provinces });
    } catch (error) {
        console.error('Error fetching provinces:', error);
        return res.status(500).json({ message: 'Failed to fetch provinces' });
    }
}