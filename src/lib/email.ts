import { Resend } from 'resend';

// Initialize Resend client
const resend = new Resend(process.env.RESEND_API_KEY);

// Fallback configuration for backwards compatibility
const fallbackFromEmail = process.env.SMTP_FROM_EMAIL || 'PNG Pess Book <noreply@example.com>';

/**
 * Send verification email to new users
 * @param email User's email address
 * @param token Verification token
 */
export async function sendVerificationEmail(email: string, token: string): Promise<void> {
    // Base URL for verification links
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const verificationUrl = `${baseUrl}/api/auth/verify-email?token=${token}`;

    try {
        await resend.emails.send({
            from: fallbackFromEmail,
            to: email,
            subject: 'Verify Your PNG Pess Book Account',
            html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">PNG Pess Book</h1>
          <p style="font-size: 18px; color: #333;">Verify Your Account</p>
        </div>
        
        <p>Thank you for registering with PNG Pess Book. Please click the button below to verify your email address:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Verify Email
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
          <p>If you didn't request this verification, you can safely ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} PNG Pess Book. All rights reserved.</p>
        </div>
      </div>
    `
        });
        console.log(`Verification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        throw error;
    }
}

/**
 * Send password reset email
 * @param email User's email address
 * @param token Reset token
 */
export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
    // Base URL for reset links
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    try {
        await resend.emails.send({
            from: fallbackFromEmail,
            to: email,
            subject: 'Reset Your PNG Pess Book Password',
            html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">PNG Pess Book</h1>
          <p style="font-size: 18px; color: #333;">Password Reset</p>
        </div>
        
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
        
        <p>This link will expire in 1 hour.</p>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
          <p>If you didn't request a password reset, you can safely ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} PNG Pess Book. All rights reserved.</p>
        </div>
      </div>
    `
        });
        console.log(`Password reset email sent to ${email}`);
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw error;
    }
}

/**
 * Send a notification email
 * @param email User's email address
 * @param subject Email subject
 * @param message Email message
 */
export async function sendNotificationEmail(email: string, subject: string, message: string): Promise<void> {
    try {
        await resend.emails.send({
            from: fallbackFromEmail,
            to: email,
            subject,
            html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 5px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #4f46e5;">PNG Pess Book</h1>
          <p style="font-size: 18px; color: #333;">${subject}</p>
        </div>
        
        <div>
          ${message}
        </div>
        
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eaeaea; text-align: center; color: #666; font-size: 12px;">
          <p>&copy; ${new Date().getFullYear()} PNG Pess Book. All rights reserved.</p>
        </div>
      </div>
    `
        });
        console.log(`Notification email sent to ${email}`);
    } catch (error) {
        console.error('Error sending notification email:', error);
        throw error;
    }
}