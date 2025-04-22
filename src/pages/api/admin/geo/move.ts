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

        const { nodeId, nodeType, newParentId } = req.body;

        if (!nodeId || !nodeType || !newParentId) {
            return res.status(400).json({ message: 'Node ID, type, and new parent ID are required' });
        }

        // Find the node and its current parent
        let node;
        let oldPath;
        let oldParentId;

        switch (nodeType) {
            case 'province':
                node = await prisma.province.findUnique({ where: { id: nodeId } });
                oldParentId = node?.geoRegionId;
                break;
            case 'district':
                node = await prisma.district.findUnique({ where: { id: nodeId } });
                oldParentId = node?.provinceId;
                break;
            case 'llg':
                node = await prisma.lLG.findUnique({ where: { id: nodeId } });
                oldParentId = node?.districtId;
                break;
            case 'ward':
                node = await prisma.ward.findUnique({ where: { id: nodeId } });
                oldParentId = node?.llgId;
                break;
            case 'abg_region':
                node = await prisma.region.findUnique({ where: { id: nodeId } });
                oldParentId = node?.geoRegionId;
                break;
            case 'abg_district':
                node = await prisma.abgDistrict.findUnique({ where: { id: nodeId } });
                oldParentId = node?.regionId;
                break;
            case 'constituency':
                node = await prisma.constituency.findUnique({ where: { id: nodeId } });
                oldParentId = node?.districtId;
                break;
            case 'mka_region':
                node = await prisma.mkaRegion.findUnique({ where: { id: nodeId } });
                oldParentId = node?.geoRegionId;
                break;
            case 'mka_ward':
                node = await prisma.mkaWard.findUnique({ where: { id: nodeId } });
                oldParentId = node?.regionId;
                break;
            default:
                return res.status(400).json({ message: 'Invalid node type' });
        }

        if (!node) {
            return res.status(404).json({ message: 'Node not found' });
        }

        oldPath = node.path;

        // Get the new parent's path to construct the new path
        let newParentPath = '';
        let newPath = '';

        switch (nodeType) {
            case 'province':
                const geoRegion = await prisma.geoRegion.findUnique({ where: { id: newParentId } });
                newParentPath = geoRegion?.name || '';
                break;
            case 'district':
                const province = await prisma.province.findUnique({ where: { id: newParentId } });
                newParentPath = province?.path || '';
                break;
            case 'llg':
                const district = await prisma.district.findUnique({ where: { id: newParentId } });
                newParentPath = district?.path || '';
                break;
            case 'ward':
                const llg = await prisma.lLG.findUnique({ where: { id: newParentId } });
                newParentPath = llg?.path || '';
                break;
            // Add similar cases for ABG and MKA nodes
        }

        if (!newParentPath) {
            return res.status(404).json({ message: 'New parent node not found' });
        }

        // Construct new path
        newPath = `${newParentPath}/${node.name}`;

        // Update the node with new parent and path
        let updatedNode;
        switch (nodeType) {
            case 'province':
                updatedNode = await prisma.province.update({
                    where: { id: nodeId },
                    data: { geoRegionId: newParentId, path: newPath }
                });
                break;
            case 'district':
                updatedNode = await prisma.district.update({
                    where: { id: nodeId },
                    data: { provinceId: newParentId, path: newPath }
                });
                break;
            // Add similar cases for other node types
        }

        // Record the movement in history
        await prisma.nodeMovementHistory.create({
            data: {
                nodeId,
                nodeType,
                oldParentId: oldParentId!,
                newParentId,
                adminId: decodedToken.id,
                oldPath,
                newPath
            }
        });

        return res.status(200).json({
            message: 'Node moved successfully',
            node: updatedNode
        });

    } catch (error) {
        console.error('Error moving node:', error);
        return res.status(500).json({ message: 'Failed to move node' });
    }
}