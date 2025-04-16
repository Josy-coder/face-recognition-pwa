import { NextApiRequest, NextApiResponse } from 'next';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get token from cookies
        const cookies = parseCookies({ req });
        const token = cookies.admin_token;

        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Verify token
        const decoded = verifyToken(token);

        if (!decoded || decoded.role !== 'ADMIN') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        // Return success
        return res.status(200).json({
            message: 'Authenticated',
            adminId: decoded.userId,
            role: decoded.role
        });
    } catch (error) {
        console.error('Error checking admin auth:', error);
        return res.status(401).json({ message: 'Authentication failed' });
    }
}