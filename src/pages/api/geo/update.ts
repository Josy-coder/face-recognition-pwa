// pages/api/admin/geo/update.ts - Update an existing geographical node
import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'PUT') {
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

        const { id, name } = req.body;

        if (!id || !name) {
            return res.status(400).json({ message: 'Node ID and name are required' });
        }

        // Find node type by checking all possible tables
        // We need to determine which model to update

        // Check Province
        const province = await prisma.province.findUnique({ where: { id } });
        if (province) {
            const updatedNode = await prisma.province.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check District
        const district = await prisma.district.findUnique({ where: { id } });
        if (district) {
            const updatedNode = await prisma.district.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check LLG
        const llg = await prisma.lLG.findUnique({ where: { id } });
        if (llg) {
            const updatedNode = await prisma.lLG.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check Ward
        const ward = await prisma.ward.findUnique({ where: { id } });
        if (ward) {
            const updatedNode = await prisma.ward.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check ABG Region
        const region = await prisma.region.findUnique({ where: { id } });
        if (region) {
            const updatedNode = await prisma.region.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check ABG District
        const abgDistrict = await prisma.abgDistrict.findUnique({ where: { id } });
        if (abgDistrict) {
            const updatedNode = await prisma.abgDistrict.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check Constituency
        const constituency = await prisma.constituency.findUnique({ where: { id } });
        if (constituency) {
            const updatedNode = await prisma.constituency.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check MKA Region
        const mkaRegion = await prisma.mkaRegion.findUnique({ where: { id } });
        if (mkaRegion) {
            const updatedNode = await prisma.mkaRegion.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // Check MKA Ward
        const mkaWard = await prisma.mkaWard.findUnique({ where: { id } });
        if (mkaWard) {
            const updatedNode = await prisma.mkaWard.update({
                where: { id },
                data: { name }
            });
            return res.status(200).json({
                message: 'Node updated successfully',
                node: updatedNode
            });
        }

        // If we get here, node wasn't found in any table
        return res.status(404).json({ message: 'Node not found' });

    } catch (error) {
        console.error('Error updating geographical node:', error);
        return res.status(500).json({ message: 'Failed to update node' });
    }
}