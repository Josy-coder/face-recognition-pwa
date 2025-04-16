import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function AdminLoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Use auth store
    const { setUser, setAdminLoggedIn, checkAuthStatus, isAdminLoggedIn } = useAuthStore();

    // Check if already logged in as admin
    useEffect(() => {
        if (isAdminLoggedIn) {
            router.push('/admin');
        }
    }, [isAdminLoggedIn, router]);

    // Handle admin login
    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Email and password are required');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    rememberMe,
                }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update auth store
                setUser({
                    id: data.admin.id,
                    email: data.admin.email,
                    firstName: data.admin.firstName,
                    lastName: data.admin.lastName,
                    role: data.admin.role
                });
                setAdminLoggedIn(true);

                // Run auth check to confirm the cookie is set properly
                await checkAuthStatus();

                toast.success('Admin login successful');

                // Redirect to admin panel
                router.push('/admin');
            } else {
                toast.error(data.message || 'Invalid admin credentials');
            }
        } catch (error) {
            console.error('Admin login error:', error);
            toast.error('An error occurred during admin login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Admin Login - PNG Pess Book</title>
                <meta name="description" content="Admin login for PNG Pess Book" />
            </Head>
            <Layout title="" showHistory={false}>
                <div className="max-w-md mx-auto">
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center">
                            <CardTitle className="text-xl font-bold">Admin Login</CardTitle>
                            <CardDescription>
                                Access the administration panel
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleAdminLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Admin Email:</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Admin Email Address"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password">Password:</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Password"
                                        required
                                        disabled={isLoading}
                                    />
                                </div>

                                <div className="flex items-center">
                                    <Checkbox
                                        id="remember-me"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                        disabled={isLoading}
                                    />
                                    <Label htmlFor="remember-me" className="ml-2 text-sm">
                                        Remember me
                                    </Label>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Logging in...
                                        </>
                                    ) : (
                                        'Admin Login'
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}