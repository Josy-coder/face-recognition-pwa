import { NextApiRequest, NextApiResponse } from 'next';
import { loginAdmin } from '@/lib/auth';
import { serialize } from 'cookie';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password, rememberMe } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await loginAdmin(email, password);

        if (!result.success) {
            return res.status(401).json({ message: result.message || 'Invalid credentials' });
        }

        // Set cookie with admin token
        // Fix: Use 'strict' as literal type instead of string
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const, // Fix: Type as const to match expected values
            maxAge: rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60, // 7 days or 1 day
            path: '/'
        };

        res.setHeader('Set-Cookie', serialize('admin_token', result.token as string, cookieOptions));

        return res.status(200).json({
            message: 'Login successful',
            admin: {
                id: result.admin?.id,
                email: result.admin?.email,
                firstName: result.admin?.firstName,
                lastName: result.admin?.lastName,
                role: result.admin?.role
            }
        });
    } catch (error) {
        console.error('Error in admin login API:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
}