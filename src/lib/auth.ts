import {PrismaClient} from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@pngpessbook.com';

// Password hashing
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
}

// Password verification
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return await bcrypt.compare(password, hashedPassword);
}

// Generate JWT token
export function generateToken(userId: string, role: string): string {
    return jwt.sign({ userId, role }, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token: string): { userId: string; role: string } | null {
    try {
        return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    } catch (error) {
        return null;
    }
}

// Send confirmation email (not requiring verification)
export async function sendConfirmationEmail(email: string, name: string = ''): Promise<boolean> {
    try {
        // Initialize email transporter
        const transporter = nodemailer.createTransport({
            host: process.env.EMAIL_SERVER_HOST || 'smtp.example.com',
            port: Number(process.env.EMAIL_SERVER_PORT) || 587,
            secure: process.env.EMAIL_SERVER_SECURE === 'true',
            auth: {
                user: process.env.EMAIL_SERVER_USER || 'user',
                pass: process.env.EMAIL_SERVER_PASSWORD || 'password',
            },
        });

        // Send email
        await transporter.sendMail({
            from: EMAIL_FROM,
            to: email,
            subject: 'Welcome to PNG Pess Book',
            text: `Welcome to PNG Pess Book! Your account has been created successfully. You can now login using your email and password.`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #4f46e5;">Welcome to PNG Pess Book!</h2>
          <p>Dear ${name || 'User'},</p>
          <p>Thank you for registering with PNG Pess Book. Your account has been created successfully.</p>
          <p>You can now login using your email and password.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/login" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
              Login Now
            </a>
          </div>
          <p>Best regards,<br />PNG Pess Book Team</p>
        </div>
      `,
        });

        return true;
    } catch (error) {
        console.error('Error sending confirmation email:', error);
        return false;
    }
}

// User registration (without email verification)
export async function registerUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    faceId?: string;
    residentialPath?: string;
}): Promise<{ success: boolean; userId?: string; message?: string }> {
    try {
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({
            where: { email: userData.email },
        });

        if (existingUser) {
            return { success: false, message: 'User with this email already exists' };
        }

        // Hash password
        const hashedPassword = await hashPassword(userData.password);

        // Create new user (without verification token)
        const newUser = await prisma.user.create({
            data: {
                email: userData.email,
                password: hashedPassword,
                firstName: userData.firstName,
                middleName: userData.middleName,
                lastName: userData.lastName,
                gender: userData.gender,
                faceId: userData.faceId,
                residentialPath: userData.residentialPath,
                // All users are considered verified right away
                isEmailVerified: true
            },
        });

        // Send confirmation email (not verification)
        const name = userData.firstName ? `${userData.firstName} ${userData.lastName || ''}` : '';
        await sendConfirmationEmail(userData.email, name);

        return { success: true, userId: newUser.id };
    } catch (error) {
        console.error('Error registering user:', error);
        return { success: false, message: 'Registration failed' };
    }
}

// Admin registration
export async function registerAdmin(adminData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
}): Promise<{ success: boolean; adminId?: string; message?: string }> {
    try {
        // Check if admin already exists
        const existingAdmin = await prisma.admin.findUnique({
            where: { email: adminData.email },
        });

        if (existingAdmin) {
            return { success: false, message: 'Admin with this email already exists' };
        }

        // Hash password
        const hashedPassword = await hashPassword(adminData.password);

        // Create new admin
        const newAdmin = await prisma.admin.create({
            data: {
                email: adminData.email,
                password: hashedPassword,
                firstName: adminData.firstName,
                lastName: adminData.lastName,
            },
        });

        // Send confirmation email
        const name = adminData.firstName ? `${adminData.firstName} ${adminData.lastName || ''}` : '';
        await sendConfirmationEmail(adminData.email, name);

        return { success: true, adminId: newAdmin.id };
    } catch (error) {
        console.error('Error registering admin:', error);
        return { success: false, message: 'Admin registration failed' };
    }
}

// User login
export async function loginUser(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    user?: any;
    message?: string;
}> {
    try {
        // Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Generate token
        const token = generateToken(user.id, user.role);

        // Return user data without password
        const { password: _, ...userData } = user;

        return { success: true, token, user: userData };
    } catch (error) {
        console.error('Error logging in user:', error);
        return { success: false, message: 'Login failed' };
    }
}

// Admin login
export async function loginAdmin(email: string, password: string): Promise<{
    success: boolean;
    token?: string;
    admin?: any;
    message?: string;
}> {
    try {
        // Find admin
        const admin = await prisma.admin.findUnique({
            where: { email },
        });

        if (!admin) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Verify password
        const isPasswordValid = await verifyPassword(password, admin.password);
        if (!isPasswordValid) {
            return { success: false, message: 'Invalid credentials' };
        }

        // Generate token
        const token = generateToken(admin.id, admin.role);

        // Return admin data without password
        const { password: _, ...adminData } = admin;

        return { success: true, token, admin: adminData };
    } catch (error) {
        console.error('Error logging in admin:', error);
        return { success: false, message: 'Admin login failed' };
    }
}

// Link user to a face ID
export async function linkUserToFace(userId: string, faceId: string, s3ImagePath?: string): Promise<boolean> {
    try {
        await prisma.user.update({
            where: { id: userId },
            data: {
                faceId,
                profileImageUrl: s3ImagePath
            },
        });
        return true;
    } catch (error) {
        console.error('Error linking user to face:', error);
        return false;
    }
}

// Register a person (can be done by a user or admin)
export async function registerPerson(personData: {
    firstName: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    faceId?: string;
    externalImageId?: string;
    s3ImagePath?: string;
    residentialPath?: string;
    contactInfo?: string;
    additionalInfo?: any;
    registeredById?: string;
    collectionIds?: string[];
}): Promise<{ success: boolean; personId?: string; message?: string }> {
    try {
        // Create new person
        const newPerson = await prisma.person.create({
            data: {
                firstName: personData.firstName,
                middleName: personData.middleName,
                lastName: personData.lastName,
                gender: personData.gender,
                faceId: personData.faceId,
                externalImageId: personData.externalImageId,
                s3ImagePath: personData.s3ImagePath,
                residentialPath: personData.residentialPath,
                contactInfo: personData.contactInfo,
                additionalInfo: personData.additionalInfo,
                registeredById: personData.registeredById,
                // Connect collections if provided
                collections: personData.collectionIds ? {
                    connect: personData.collectionIds.map(id => ({ id }))
                } : undefined,
            },
        });

        return { success: true, personId: newPerson.id };
    } catch (error) {
        console.error('Error registering person:', error);
        return { success: false, message: 'Person registration failed' };
    }
}