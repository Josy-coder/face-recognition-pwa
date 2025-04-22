import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { region, level, parentId } = req.query;

        if (!['PNG', 'ABG', 'MKA'].includes(region as string)) {
            return res.status(400).json({ message: 'Invalid region' });
        }

        let nodes;
        switch (region) {
            case 'PNG':
                switch (level) {
                    case 'provinces':
                        nodes = await prisma.province.findMany({
                            where: { geoRegion: { name: 'PNG' } },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { districts: true }
                                }
                            }
                        });
                        break;

                    case 'districts':
                        nodes = await prisma.district.findMany({
                            where: { provinceId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { llgs: true }
                                }
                            }
                        });
                        break;

                    case 'llgs':
                        nodes = await prisma.lLG.findMany({
                            where: { districtId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { wards: true }
                                }
                            }
                        });
                        break;

                    case 'wards':
                        nodes = await prisma.ward.findMany({
                            where: { llgId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                villages: true,
                                _count: {
                                    select: { locations: true }
                                }
                            }
                        });
                        break;

                    case 'locations':
                        nodes = await prisma.location.findMany({
                            where: { wardId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                path: true,
                                level: true,
                                order: true
                            }
                        });
                        break;

                    default:
                        return res.status(400).json({ message: 'Invalid level for PNG region' });
                }
                break;

            case 'ABG':
                switch (level) {
                    case 'regions':
                        nodes = await prisma.region.findMany({
                            where: { geoRegion: { name: 'ABG' } },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { districts: true }
                                }
                            }
                        });
                        break;

                    case 'districts':
                        nodes = await prisma.abgDistrict.findMany({
                            where: { regionId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { constituencies: true }
                                }
                            }
                        });
                        break;

                    case 'constituencies':
                        nodes = await prisma.constituency.findMany({
                            where: { districtId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                villages: true,
                                _count: {
                                    select: { locations: true }
                                }
                            }
                        });
                        break;

                    default:
                        return res.status(400).json({ message: 'Invalid level for ABG region' });
                }
                break;

            case 'MKA':
                switch (level) {
                    case 'regions':
                        nodes = await prisma.mkaRegion.findMany({
                            where: { geoRegion: { name: 'MKA' } },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                _count: {
                                    select: { wards: true }
                                }
                            }
                        });
                        break;

                    case 'wards':
                        nodes = await prisma.mkaWard.findMany({
                            where: { regionId: parentId as string },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                path: true,
                                level: true,
                                order: true,
                                sections: true,
                                _count: {
                                    select: { locations: true }
                                }
                            }
                        });
                        break;

                    default:
                        return res.status(400).json({ message: 'Invalid level for MKA region' });
                }
                break;
        }

        return res.status(200).json({ nodes });

    } catch (error) {
        console.error('Error fetching geo nodes:', error);
        return res.status(500).json({ message: 'Failed to fetch nodes' });
    }
}