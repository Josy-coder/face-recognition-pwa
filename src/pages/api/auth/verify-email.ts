import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { token } = req.query;

        if (!token || typeof token !== 'string') {
            return res.status(400).json({ message: 'Verification token is required' });
        }

        // Find user with the token
        const user = await prisma.user.findFirst({
            where: {
                verificationToken: token
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'Invalid verification token' });
        }

        // Update user
        await prisma.user.update({
            where: { id: user.id },
            data: {
                isEmailVerified: true,
                verificationToken: null
            }
        });

        // Redirect to login page
        res.writeHead(302, {
            Location: '/login?verified=true'
        });
        res.end();
    } catch (error) {
        console.error('Error verifying email:', error);
        return res.status(500).json({ message: 'Error verifying email' });
    }
}
