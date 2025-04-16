import { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    // Clear both admin and user tokens to be safe
    const authCookie = serialize('auth_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: -1, // Expire immediately
        path: '/',
    });

    const adminCookie = serialize('admin_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict' as const,
        maxAge: -1, // Expire immediately
        path: '/',
    });

    // Set the cookies to expire
    res.setHeader('Set-Cookie', [authCookie, adminCookie]);

    return res.status(200).json({ message: 'Logged out successfully' });
}