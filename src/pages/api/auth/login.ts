import { NextApiRequest, NextApiResponse } from 'next';
import { loginUser } from '@/lib/auth';
import { serialize } from 'cookie';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await loginUser(email, password);

        if (result.success) {
            // Set JWT token as HttpOnly cookie
            const cookie = serialize('auth_token', result.token!, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict' as const,
                maxAge: 7 * 24 * 60 * 60, // 7 days
                path: '/',
            });

            res.setHeader('Set-Cookie', cookie);

            return res.status(200).json({
                message: 'Login successful',
                user: result.user,
            });
        } else {
            return res.status(401).json({ message: result.message });
        }
    } catch (error) {
        console.error('Error in login API:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
}