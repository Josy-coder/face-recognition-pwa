import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'DELETE') {
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

        const { id } = req.body;

        if (!id) {
            return res.status(400).json({ message: 'Node ID is required' });
        }

        // Find node type by checking all possible tables
        // We need to determine which model to delete

        // Check Province
        const province = await prisma.province.findUnique({ where: { id } });
        if (province) {
            // Check for child districts
            const childDistricts = await prisma.district.findMany({
                where: { provinceId: id }
            });

            // Recursive delete needed for all children
            // For each district, delete LLGs, for each LLG delete wards
            for (const district of childDistricts) {
                const childLLGs = await prisma.lLG.findMany({
                    where: { districtId: district.id }
                });

                for (const llg of childLLGs) {
                    // Delete all wards for this LLG
                    await prisma.ward.deleteMany({
                        where: { llgId: llg.id }
                    });
                }

                // Delete all LLGs for this district
                await prisma.lLG.deleteMany({
                    where: { districtId: district.id }
                });
            }

            // Delete all districts for this province
            await prisma.district.deleteMany({
                where: { provinceId: id }
            });

            // Now delete the province
            await prisma.province.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'Province and all child nodes deleted successfully'
            });
        }

        // Check District
        const district = await prisma.district.findUnique({ where: { id } });
        if (district) {
            const childLLGs = await prisma.lLG.findMany({
                where: { districtId: id }
            });

            for (const llg of childLLGs) {
                // Delete all wards for this LLG
                await prisma.ward.deleteMany({
                    where: { llgId: llg.id }
                });
            }

            // Delete all LLGs for this district
            await prisma.lLG.deleteMany({
                where: { districtId: id }
            });

            // Now delete the district
            await prisma.district.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'District and all child nodes deleted successfully'
            });
        }

        // Check LLG
        const llg = await prisma.lLG.findUnique({ where: { id } });
        if (llg) {
            // Delete all wards for this LLG
            await prisma.ward.deleteMany({
                where: { llgId: id }
            });

            // Now delete the LLG
            await prisma.lLG.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'LLG and all child nodes deleted successfully'
            });
        }

        // Check Ward
        const ward = await prisma.ward.findUnique({ where: { id } });
        if (ward) {
            await prisma.ward.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'Ward deleted successfully'
            });
        }

        // Check ABG Region
        const region = await prisma.region.findUnique({ where: { id } });
        if (region) {
            // Check for child districts
            const childDistricts = await prisma.abgDistrict.findMany({
                where: { regionId: id }
            });

            // For each district, delete constituencies
            for (const district of childDistricts) {
                await prisma.constituency.deleteMany({
                    where: { districtId: district.id }
                });
            }

            // Delete all districts for this region
            await prisma.abgDistrict.deleteMany({
                where: { regionId: id }
            });

            // Now delete the region
            await prisma.region.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'Region and all child nodes deleted successfully'
            });
        }

        // Check ABG District
        const abgDistrict = await prisma.abgDistrict.findUnique({ where: { id } });
        if (abgDistrict) {
            // Delete all constituencies for this district
            await prisma.constituency.deleteMany({
                where: { districtId: id }
            });

            // Now delete the district
            await prisma.abgDistrict.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'District and all child nodes deleted successfully'
            });
        }

        // Check Constituency
        const constituency = await prisma.constituency.findUnique({ where: { id } });
        if (constituency) {
            await prisma.constituency.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'Constituency deleted successfully'
            });
        }

        // Check MKA Region
        const mkaRegion = await prisma.mkaRegion.findUnique({ where: { id } });
        if (mkaRegion) {
            // Delete all wards for this region
            await prisma.mkaWard.deleteMany({
                where: { regionId: id }
            });

            // Now delete the region
            await prisma.mkaRegion.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'MKA Region and all child nodes deleted successfully'
            });
        }

        // Check MKA Ward
        const mkaWard = await prisma.mkaWard.findUnique({ where: { id } });
        if (mkaWard) {
            await prisma.mkaWard.delete({
                where: { id }
            });

            return res.status(200).json({
                message: 'MKA Ward deleted successfully'
            });
        }

        // If we get here, node wasn't found in any table
        return res.status(404).json({ message: 'Node not found' });

    } catch (error) {
        console.error('Error deleting geographical node:', error);
        return res.status(500).json({ message: 'Failed to delete node' });
    }
}