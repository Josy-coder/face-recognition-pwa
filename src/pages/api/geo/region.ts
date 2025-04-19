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
        // Fetch all geographic regions (PNG, ABG, MKA)
        const regions = await prisma.geoRegion.findMany({
            orderBy: { name: 'asc' }
        });

        return res.status(200).json({ regions });
    } catch (error) {
        console.error('Error fetching regions:', error);
        return res.status(500).json({ message: 'Failed to fetch regions' });
    }
}
