import { NextRequest, NextResponse } from 'next/server';

export async function middleware(req: NextRequest) {
    // Get path
    const path = req.nextUrl.pathname;

    // Check if the path is an admin path that needs protection
    if (path.startsWith('/admin') && path !== '/admin/login' && path !== '/admin/setup') {
        // Get the cookies
        const token = req.cookies.get('admin_token')?.value;

        // If no token exists, redirect to login
        if (!token) {
            const url = new URL('/admin/login', req.url);
            return NextResponse.redirect(url);
        }

        // If it's an API route under /api/collections or other protected APIs, pass the token
        if (path.startsWith('/api/')) {
            // Clone the request headers
            const requestHeaders = new Headers(req.headers);

            // Add Authorization header with the token
            requestHeaders.set('Authorization', `Bearer ${token}`);

            // Return a new request with the updated headers
            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        }

        // Token exists, can proceed with the request
        return NextResponse.next();
    }

    // For user authentication on protected pages and API routes
    if (path.startsWith('/profile') ||
        path.startsWith('/register-person') ||
        path.startsWith('/api/auth/profile') ||
        path.startsWith('/api/people') ||
        path.startsWith('/api/albums')) {

        const userToken = req.cookies.get('auth_token')?.value;
        const adminToken = req.cookies.get('admin_token')?.value;

        // Check for either token type - allow access with either
        if (!userToken && !adminToken && !path.startsWith('/api/')) {
            const url = new URL('/login', req.url);
            url.searchParams.set('redirect', path); // Save the intended destination
            return NextResponse.redirect(url);
        }

        if (path.startsWith('/api/')) {
            // Add auth header for API routes
            const requestHeaders = new Headers(req.headers);

            // Pass whichever token is available (prefer user token for profile endpoints)
            if (userToken) {
                requestHeaders.set('Authorization', `Bearer ${userToken}`);
            } else if (adminToken) {
                requestHeaders.set('Authorization', `Bearer ${adminToken}`);
            }

            return NextResponse.next({
                request: {
                    headers: requestHeaders,
                },
            });
        }
    }

    // For non-admin paths or explicitly allowed admin paths, proceed normally
    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/api/:path*', '/profile/:path*', '/register-person', '/albums/:path*'],
};