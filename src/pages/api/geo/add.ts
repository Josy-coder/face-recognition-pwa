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
        // Get admin token from cookies
        const cookies = parseCookies({ req });
        const token = cookies.admin_token || req.headers.authorization?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Not logged in as admin' });
        }

        // Verify admin token
        const decodedToken = verifyToken(token);

        if (!decodedToken || decodedToken.role !== 'admin') {
            return res.status(401).json({ message: 'Unauthorized: Admin access required' });
        }

        const { name, type, parentId, parentPath, region } = req.body;

        if (!name || !type || !region) {
            return res.status(400).json({ message: 'Name, type, and region are required' });
        }

        let result;

        // Handle different node types based on region and hierarchical level
        if (region === 'PNG') {
            if (type === 'province') {
                // Find the PNG region
                const pngRegion = await prisma.geoRegion.findFirst({
                    where: { name: 'PNG' }
                });

                if (!pngRegion) {
                    return res.status(404).json({ message: 'PNG region not found' });
                }

                // Create a province
                result = await prisma.province.create({
                    data: {
                        name,
                        geoRegion: { connect: { id: pngRegion.id } }
                    }
                });
            } else if (type === 'district') {
                // Find the parent province
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent province ID required' });
                }

                // Create a district under the province
                result = await prisma.district.create({
                    data: {
                        name,
                        province: { connect: { id: parentId } }
                    }
                });
            } else if (type === 'llg') {
                // Find the parent district
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent district ID required' });
                }

                // Create an LLG under the district
                result = await prisma.lLG.create({
                    data: {
                        name,
                        district: { connect: { id: parentId } }
                    }
                });
            } else if (type === 'ward') {
                // Find the parent LLG
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent LLG ID required' });
                }

                // Create a ward under the LLG
                result = await prisma.ward.create({
                    data: {
                        name,
                        llg: { connect: { id: parentId } },
                        villages: []
                    }
                });
            } else {
                return res.status(400).json({ message: 'Invalid node type for PNG region' });
            }
        } else if (region === 'ABG') {
            if (type === 'region') {
                // Find the ABG region
                const abgRegion = await prisma.geoRegion.findFirst({
                    where: { name: 'ABG' }
                });

                if (!abgRegion) {
                    return res.status(404).json({ message: 'ABG region not found' });
                }

                // Create a sub-region
                result = await prisma.region.create({
                    data: {
                        name,
                        geoRegion: { connect: { id: abgRegion.id } }
                    }
                });
            } else if (type === 'district') {
                // Find the parent region
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent region ID required' });
                }

                // Create an ABG district
                result = await prisma.abgDistrict.create({
                    data: {
                        name,
                        region: { connect: { id: parentId } }
                    }
                });
            } else if (type === 'constituency') {
                // Find the parent district
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent district ID required' });
                }

                // Create a constituency
                result = await prisma.constituency.create({
                    data: {
                        name,
                        district: { connect: { id: parentId } },
                        villages: []
                    }
                });
            } else {
                return res.status(400).json({ message: 'Invalid node type for ABG region' });
            }
        } else if (region === 'MKA') {
            if (type === 'region') {
                // Find the MKA region
                const mkaRegion = await prisma.geoRegion.findFirst({
                    where: { name: 'MKA' }
                });

                if (!mkaRegion) {
                    return res.status(404).json({ message: 'MKA region not found' });
                }

                // Create an MKA sub-region
                result = await prisma.mkaRegion.create({
                    data: {
                        name,
                        geoRegion: { connect: { id: mkaRegion.id } }
                    }
                });
            } else if (type === 'ward') {
                // Find the parent region
                if (!parentId) {
                    return res.status(400).json({ message: 'Parent region ID required' });
                }

                // Create an MKA ward
                result = await prisma.mkaWard.create({
                    data: {
                        name,
                        region: { connect: { id: parentId } },
                        sections: []
                    }
                });
            } else {
                return res.status(400).json({ message: 'Invalid node type for MKA region' });
            }
        } else {
            return res.status(400).json({ message: 'Invalid region' });
        }

        return res.status(201).json({
            message: 'Node created successfully',
            node: result
        });
    } catch (error) {
        console.error('Error creating geographical node:', error);
        return res.status(500).json({ message: 'Failed to create node' });
    }
}