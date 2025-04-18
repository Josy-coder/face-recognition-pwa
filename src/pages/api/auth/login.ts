import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize } from 'cookie';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required' });
        }

        // Find user
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check if email is verified
        if (!user.isEmailVerified) {
            return res.status(401).json({ message: 'Please verify your email before logging in' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT
        const jwtSecret = process.env.JWT_SECRET || 'your-jwt-secret';
        const token = jwt.sign(
            { userId: user.id, email: user.email },
            jwtSecret,
            { expiresIn: '7d' }
        );

        // Set cookie
        const cookie = serialize('auth_token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict' as const,
            maxAge: 7 * 24 * 60 * 60, // 7 days
            path: '/',
        });

        res.setHeader('Set-Cookie', cookie);

        // Return user data (excluding password)
        const { password: _, ...userData } = user;

        return res.status(200).json({
            message: 'Login successful',
            user: userData
        });
    } catch (error) {
        console.error('Error in login API:', error);
        return res.status(500).json({ message: 'Login failed' });
    }
}