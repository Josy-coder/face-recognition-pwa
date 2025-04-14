import { NextApiRequest, NextApiResponse } from 'next';
import { registerAdmin } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await registerAdmin({
            email,
            password,
            firstName,
            lastName
        });

        if (result.success) {
            return res.status(201).json({ message: 'Admin registered successfully', adminId: result.adminId });
        } else {
            return res.status(400).json({ message: result.message });
        }
    } catch (error) {
        console.error('Error in admin registration API:', error);
        return res.status(500).json({ message: 'Admin registration failed' });
    }
}