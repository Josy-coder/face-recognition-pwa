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
        // Get tokens from cookies or Authorization header
        const cookies = parseCookies({ req });
        let userToken = cookies.auth_token;
        let adminToken = cookies.admin_token;
        let isAdmin = false;

        // Fallback to Authorization header if no cookie
        if (!userToken && !adminToken) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7); // Remove 'Bearer ' prefix

                // Try to decode and determine if it's an admin or user token
                try {
                    const decoded = verifyToken(token);
                    if (decoded && decoded.role === 'ADMIN') {
                        adminToken = token;
                    } else {
                        userToken = token;
                    }
                } catch (error) {
                    console.error('Token verification error:', error);
                }
            }
        }

        // If adminToken exists, use that (admin is viewing profile)
        if (adminToken) {
            const decodedToken = verifyToken(adminToken);

            if (!decodedToken) {
                return res.status(401).json({ message: 'Unauthorized: Invalid admin token' });
            }

            // Fetch admin from database
            const admin = await prisma.admin.findUnique({
                where: { id: decodedToken.userId },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                }
            });

            if (!admin) {
                return res.status(404).json({ message: 'Admin not found' });
            }

            // Convert admin data to user format for the profile page
            const adminAsUser = {
                id: admin.id,
                email: admin.email,
                firstName: admin.firstName,
                lastName: admin.lastName,
                role: admin.role,
                // Add default values for missing user fields
                middleName: null,
                gender: null,
                dateOfBirth: null,
                profileImageUrl: null,
                residentialPath: null
            };

            // Return admin data formatted as user
            return res.status(200).json({ user: adminAsUser, isAdmin: true });
        }

        // If userToken exists, use that (normal user viewing profile)
        if (userToken) {
            const decodedToken = verifyToken(userToken);

            if (!decodedToken) {
                return res.status(401).json({ message: 'Unauthorized: Invalid user token' });
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
            return res.status(200).json({ user, isAdmin: false });
        }

        // If we get here, no valid token was found
        return res.status(401).json({ message: 'Unauthorized: Missing token' });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        return res.status(500).json({ message: 'Internal server error' });
    }
}