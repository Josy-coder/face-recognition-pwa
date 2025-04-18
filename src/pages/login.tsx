import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Use auth store
    const { setUser, setLoggedIn, checkAuthStatus } = useAuthStore();

    // Try to load saved email on component mount
    useEffect(() => {
        const savedEmail = localStorage.getItem('userEmail');
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    // Handle credential login
    const handleCredentialLogin = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!email || !password) {
            toast.error('Email and password are required');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/login', {
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
                // Save user email in localStorage if remember me is checked
                if (rememberMe) {
                    localStorage.setItem('userEmail', email);
                } else {
                    localStorage.removeItem('userEmail');
                }

                // Update auth store
                setUser(data.user);
                setLoggedIn(true);

                // Run auth check to confirm the cookie is set properly
                await checkAuthStatus();

                toast.success('Login successful');

                // Redirect to profile
                router.push('/profile');
            } else {
                toast.error(data.message || 'Invalid credentials');
            }
        } catch (error) {
            console.error('Login error:', error);
            toast.error('An error occurred during login');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <Head>
                <title>Login - PNG Pess Book</title>
                <meta name="description" content="Login to your PNG Pess Book account" />
            </Head>
            <Layout title="" showHistory={false}>
                <div className="max-w-md mx-auto">
                    <Card className="border-none shadow-none">
                        <CardHeader className="text-center">
                            <div className="mx-auto w-24 h-24 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                                <div className="w-10 h-10 bg-amber-500 text-white flex items-center justify-center font-bold rounded-md">
                                    PNG
                                </div>
                            </div>
                            <CardTitle className="text-xl font-bold text-center">PNG PESS BOOK</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleCredentialLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Username:</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Email Address"
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
                                        'Login'
                                    )}
                                </Button>

                                <div className="text-center mt-4">
                                    <p className="text-sm text-slate-600">
                                        I have not registered as a member and would like to register for the first time now.
                                    </p>
                                    <Link href="/register">
                                        <div className="mt-2 bg-amber-500 text-white py-2 rounded-md text-center hover:bg-amber-600 transition-colors">
                                            SIGN UP TODAY
                                        </div>
                                    </Link>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}