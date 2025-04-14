import { useState, useEffect } from 'react';
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
import { RefreshCw, User, Camera } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import CameraCapture from '@/components/capture/CameraCapture';

export default function LoginPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<string>('credentials');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

                toast.success('Login successful');

                // Redirect to profile or home
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

    // Handle face login
    const handleFaceCapture = async (imageSrc: string) => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/auth/validate-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Face recognized! Welcome back.');

                // Redirect to profile
                router.push('/profile');
            } else if (response.status === 404 && data.needsRegistration) {
                // Face found but not linked to account
                toast.info('Face recognized but not linked to an account. Please register or use email login.');
            } else {
                toast.error(data.message || 'Face not recognized');
            }
        } catch (error) {
            console.error('Face login error:', error);
            toast.error('An error occurred during face login');
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
            <Layout title="Login to PNG Pess Book" showHistory={false}>
                <div className="max-w-md mx-auto">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center">
                                    <User className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
                                </div>
                            </div>
                            <CardTitle className="text-center">Welcome Back</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-2 mb-6">
                                    <TabsTrigger value="credentials" className="flex items-center gap-2">
                                        <User size={16} />
                                        <span>Email Login</span>
                                    </TabsTrigger>
                                    <TabsTrigger value="face" className="flex items-center gap-2">
                                        <Camera size={16} />
                                        <span>Face Login</span>
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="credentials">
                                    <form onSubmit={handleCredentialLogin} className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email Address</Label>
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
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password">Password</Label>
                                                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
                                                    Forgot Password?
                                                </Link>
                                            </div>
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
                                            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
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
                                    </form>
                                </TabsContent>

                                <TabsContent value="face">
                                    <div className="space-y-4">
                                        <p className="text-center text-slate-600 dark:text-slate-400 mb-4">
                                            Use your face to log in instantly. Simply look at the camera and we'll recognize you.
                                        </p>

                                        <CameraCapture
                                            onCapture={(imageSrc) => handleFaceCapture(imageSrc)}
                                        />
                                    </div>
                                </TabsContent>
                            </Tabs>

                            <div className="mt-6 text-center text-sm">
                                <p className="text-slate-600 dark:text-slate-400">
                                    Don't have an account?{' '}
                                    <Link href="/register" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                                        Register Now
                                    </Link>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}