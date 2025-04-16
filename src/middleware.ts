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

    // For user authentication on regular pages
    if (path.startsWith('/profile') || path.startsWith('/api/auth/profile')) {
        const token = req.cookies.get('auth_token')?.value;

        if (!token && !path.startsWith('/api/')) {
            const url = new URL('/login', req.url);
            return NextResponse.redirect(url);
        }

        if (path.startsWith('/api/')) {
            // Add auth header for API routes
            const requestHeaders = new Headers(req.headers);
            if (token) {
                requestHeaders.set('Authorization', `Bearer ${token}`);
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

// Configure which paths this middleware will run on
export const config = {
    matcher: ['/admin/:path*', '/api/:path*', '/profile/:path*'],
};