import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

type LocationNode = {
    id: string;
    name: string;
    type: string;
    path: string;
    parentId: string | null;
    level: number;
    children: LocationNode[];
};

const prisma = new PrismaClient();

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Fetch all regions
        const regions = await prisma.geoRegion.findMany({
            orderBy: { name: 'asc' },
            include: {
                provinces: {
                    orderBy: { name: 'asc' },
                    include: {
                        districts: {
                            orderBy: { name: 'asc' },
                            include: {
                                llgs: {
                                    orderBy: { name: 'asc' },
                                    include: {
                                        wards: {
                                            orderBy: { name: 'asc' }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                regions: {
                    orderBy: { name: 'asc' },
                    include: {
                        districts: {
                            orderBy: { name: 'asc' },
                            include: {
                                constituencies: {
                                    orderBy: { name: 'asc' }
                                }
                            }
                        }
                    }
                },
                mkaRegions: {
                    orderBy: { name: 'asc' },
                    include: {
                        wards: {
                            orderBy: { name: 'asc' }
                        }
                    }
                }
            }
        });

        // Transform data into a hierarchical structure
        const locationHierarchy = regions.map(region => {
            const hierarchy: LocationNode = {
                id: region.id,
                name: region.name,
                type: 'region',
                path: region.name,
                parentId: null,
                level: 0,
                children: []
            };

            // PNG structure: Provinces -> Districts -> LLGs -> Wards
            if (region.name === 'PNG') {
                hierarchy.children = region.provinces.map(province => {
                    return {
                        id: province.id,
                        name: province.name,
                        type: 'province',
                        path: `${region.name}/${province.name}`,
                        parentId: region.id,
                        level: 1,
                        children: province.districts.map(district => {
                            return {
                                id: district.id,
                                name: district.name,
                                type: 'district',
                                path: `${region.name}/${province.name}/${district.name}`,
                                parentId: province.id,
                                level: 2,
                                children: district.llgs.map(llg => {
                                    return {
                                        id: llg.id,
                                        name: llg.name,
                                        type: 'llg',
                                        path: `${region.name}/${province.name}/${district.name}/${llg.name}`,
                                        parentId: district.id,
                                        level: 3,
                                        children: llg.wards.map(ward => {
                                            return {
                                                id: ward.id,
                                                name: ward.name,
                                                type: 'ward',
                                                path: `${region.name}/${province.name}/${district.name}/${llg.name}/${ward.name}`,
                                                parentId: llg.id,
                                                level: 4,
                                                children: ward.villages.map((village, index) => {
                                                    return {
                                                        id: `${ward.id}-village-${index}`,
                                                        name: village,
                                                        type: 'village',
                                                        path: `${region.name}/${province.name}/${district.name}/${llg.name}/${ward.name}/${village}`,
                                                        parentId: ward.id,
                                                        level: 5,
                                                        children: []
                                                    };
                                                })
                                            };
                                        })
                                    };
                                })
                            };
                        })
                    };
                });
            }
            // ABG structure: Regions -> Districts -> Constituencies
            else if (region.name === 'ABG') {
                hierarchy.children = region.regions.map(subRegion => {
                    return {
                        id: subRegion.id,
                        name: subRegion.name,
                        type: 'region',
                        path: `${region.name}/${subRegion.name}`,
                        parentId: region.id,
                        level: 1,
                        children: subRegion.districts.map(district => {
                            return {
                                id: district.id,
                                name: district.name,
                                type: 'district',
                                path: `${region.name}/${subRegion.name}/${district.name}`,
                                parentId: subRegion.id,
                                level: 2,
                                children: district.constituencies.map(constituency => {
                                    return {
                                        id: constituency.id,
                                        name: constituency.name,
                                        type: 'constituency',
                                        path: `${region.name}/${subRegion.name}/${district.name}/${constituency.name}`,
                                        parentId: district.id,
                                        level: 3,
                                        children: constituency.villages.map((village, index) => {
                                            return {
                                                id: `${constituency.id}-village-${index}`,
                                                name: village,
                                                type: 'village',
                                                path: `${region.name}/${subRegion.name}/${district.name}/${constituency.name}/${village}`,
                                                parentId: constituency.id,
                                                level: 4,
                                                children: []
                                            };
                                        })
                                    };
                                })
                            };
                        })
                    };
                });
            }
            // MKA structure: Regions -> Wards
            else if (region.name === 'MKA') {
                hierarchy.children = region.mkaRegions.map(mkaRegion => {
                    return {
                        id: mkaRegion.id,
                        name: mkaRegion.name,
                        type: 'region',
                        path: `${region.name}/${mkaRegion.name}`,
                        parentId: region.id,
                        level: 1,
                        children: mkaRegion.wards.map(ward => {
                            return {
                                id: ward.id,
                                name: ward.name,
                                type: 'ward',
                                path: `${region.name}/${mkaRegion.name}/${ward.name}`,
                                parentId: mkaRegion.id,
                                level: 2,
                                children: ward.sections.map((section, index) => {
                                    return {
                                        id: `${ward.id}-section-${index}`,
                                        name: section,
                                        type: 'section',
                                        path: `${region.name}/${mkaRegion.name}/${ward.name}/${section}`,
                                        parentId: ward.id,
                                        level: 3,
                                        children: []
                                    };
                                })
                            };
                        })
                    };
                });
            }

            return hierarchy;
        });

        return res.status(200).json({ locations: locationHierarchy });
    } catch (error) {
        console.error('Error fetching all locations:', error);
        return res.status(500).json({ message: 'Failed to fetch locations' });
    }
}