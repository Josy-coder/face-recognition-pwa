import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { parseCookies } from 'nookies';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        // Get token from cookies or Authorization header
        const cookies = parseCookies({ req });
        let token = cookies.auth_token;

        // Fallback to Authorization header if no cookie
        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.substring(7); // Remove 'Bearer ' prefix
            }
        }

        // If still no token, return unauthorized
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized: Missing token' });
        }

        const decodedToken = verifyToken(token);

        if (!decodedToken) {
            return res.status(401).json({ message: 'Unauthorized: Invalid token' });
        }

        // Fetch user from database
        const user = await prisma.user.findUnique({
            where: { id: decodedToken.userId },
            select: {
                id: true,
                email: true,
                firstName: true,
                middleName: true,
                lastName: true,
                gender: true,
                dateOfBirth: true,
                profileImageUrl: true,
                residentialPath: true,
                role: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return user data
        return res.status(200).json({ user });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}