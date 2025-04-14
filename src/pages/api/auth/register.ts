import { NextApiRequest, NextApiResponse } from 'next';
import { registerUser } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password, firstName, middleName, lastName, gender, faceId, residentialPath } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        const result = await registerUser({
            email,
            password,
            firstName,
            middleName,
            lastName,
            gender,
            faceId,
            residentialPath,
        });

        if (result.success) {
            return res.status(201).json({ message: 'User registered successfully. Please check your email to verify your account.', userId: result.userId });
        } else {
            return res.status(400).json({ message: result.message });
        }
    } catch (error) {
        console.error('Error in registration API:', error);
        return res.status(500).json({ message: 'Registration failed' });
    }
}