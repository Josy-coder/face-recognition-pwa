// src/pages/api/geo/[region]/[level].ts
import { NextApiRequest, NextApiResponse } from 'next';
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
        const { region, level, parentId } = req.query;
        console.log('Request params:', { region, level, parentId });

        if (!['PNG', 'ABG', 'MKA'].includes(region as string)) {
            return res.status(400).json({ message: 'Invalid region' });
        }

        // Force disable caching to prevent 304 responses
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        let nodes = [];
        let nodesQuery;

        switch (region) {
            case 'PNG':
                switch (level) {
                    case 'provinces':
                        // First check if the GeoRegion exists
                        const pngRegion = await prisma.geoRegion.findUnique({
                            where: { name: 'PNG' }
                        });

                        if (!pngRegion) {
                            console.log('PNG region not found in database');
                            return res.status(404).json({
                                message: 'PNG region not found. Please ensure the database is seeded.'
                            });
                        }

                        console.log('Found PNG region:', pngRegion);

                        // Now query the provinces with debug logging
                        nodesQuery = prisma.province.findMany({
                            where: {
                                geoRegionId: pngRegion.id // Use ID directly instead of relation
                            },
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

                        console.log('Executing province query for geoRegionId:', pngRegion.id);
                        nodes = await nodesQuery;
                        console.log(`Found ${nodes.length} provinces`);
                        break;

                    case 'districts':
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for districts' });
                        }
                        nodes = await prisma.district.findMany({
                            where: {
                                provinceId: parentId as string
                            },
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for LLGs' });
                        }
                        nodes = await prisma.lLG.findMany({
                            where: {
                                districtId: parentId as string
                            },
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for wards' });
                        }
                        nodes = await prisma.ward.findMany({
                            where: {
                                llgId: parentId as string
                            },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for locations' });
                        }
                        nodes = await prisma.location.findMany({
                            where: {
                                wardId: parentId as string
                            },
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
                        const abgRegion = await prisma.geoRegion.findUnique({
                            where: { name: 'ABG' }
                        });

                        if (!abgRegion) {
                            console.log('ABG region not found in database');
                            return res.status(404).json({
                                message: 'ABG region not found. Please ensure the database is seeded.'
                            });
                        }

                        console.log('Found ABG region:', abgRegion);

                        nodes = await prisma.region.findMany({
                            where: {
                                geoRegionId: abgRegion.id
                            },
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for districts' });
                        }
                        nodes = await prisma.abgDistrict.findMany({
                            where: {
                                regionId: parentId as string
                            },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for constituencies' });
                        }
                        nodes = await prisma.constituency.findMany({
                            where: {
                                districtId: parentId as string
                            },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
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
                        const mkaRegion = await prisma.geoRegion.findUnique({
                            where: { name: 'MKA' }
                        });

                        if (!mkaRegion) {
                            console.log('MKA region not found in database');
                            return res.status(404).json({
                                message: 'MKA region not found. Please ensure the database is seeded.'
                            });
                        }

                        console.log('Found MKA region:', mkaRegion);

                        nodes = await prisma.mkaRegion.findMany({
                            where: {
                                geoRegionId: mkaRegion.id
                            },
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
                        if (!parentId) {
                            return res.status(400).json({ message: 'Parent ID is required for wards' });
                        }
                        nodes = await prisma.mkaWard.findMany({
                            where: {
                                regionId: parentId as string
                            },
                            orderBy: { order: 'asc' },
                            select: {
                                id: true,
                                name: true,
                                code: true,
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

        console.log(`Found ${nodes.length} nodes for ${region} at level ${level}`);

        if (!nodes.length) {
            return res.status(200).json({
                nodes: [],
                message: `No nodes found for ${region} at level ${level}. Please ensure data is seeded.`
            });
        }

        return res.status(200).json({ nodes });

    } catch (error) {
        console.error('Error in geo API:', error);
        return res.status(500).json({
            message: 'Failed to fetch nodes',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}