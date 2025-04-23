import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { RefreshCw, ArrowLeft } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useEffect } from 'react';

export default function CreateAlbumPage() {
    const router = useRouter();
    const [albumName, setAlbumName] = useState('');
    const [albumDescription, setAlbumDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Get auth state from Zustand store
    const { isLoggedIn, checkAuthStatus } = useAuthStore();

    // Check authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            if (!isLoggedIn) {
                await checkAuthStatus();
            }
            setIsLoading(false);
        };

        verifyAuth();
    }, [isLoggedIn, checkAuthStatus]);

    // Redirect if not logged in
    useEffect(() => {
        if (!isLoading && !isLoggedIn) {
            toast.error('Please log in to create albums');
            router.push('/login?redirect=/create-album');
        }
    }, [isLoading, isLoggedIn, router]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!albumName.trim()) {
            toast.error('Please enter an album name');
            return;
        }

        setIsSubmitting(true);

        try {
            const { userData, adminData } = useAuthStore.getState();
            const userId = userData?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch('/api/albums/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: albumName.trim(),
                    description: albumDescription.trim(),
                    userId: userId
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to create album');
            }

            const data = await response.json();

            toast.success('Album created successfully');

            // Redirect to the profile page with the albums tab active
            router.push('/profile?tab=albums');

        } catch (error) {
            console.error('Error creating album:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while creating the album');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Handle cancellation
    const handleCancel = () => {
        router.back();
    };

    if (isLoading) {
        return (
            <Layout title="Loading..." showHistory={false} showNewSearch={false}>
                <div className="flex justify-center items-center h-64">
                    <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
            </Layout>
        );
    }

    return (
        <>
            <Head>
                <title>Create New Album - PNG Pess Book</title>
                <meta name="description" content="Create a new album in PNG Pess Book" />
            </Head>
            <Layout title="Create New Album" showHistory={false} showNewSearch={false}>
                <div className="max-w-2xl mx-auto">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="mb-4 flex items-center"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back</Button>

                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-50">
                            <CardTitle>Create a New Album</CardTitle>
                        </CardHeader>
                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-6 space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="album-name">Album Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="album-name"
                                        value={albumName}
                                        onChange={(e) => setAlbumName(e.target.value)}
                                        placeholder="Enter album name"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="album-description">Description</Label>
                                    <Textarea
                                        id="album-description"
                                        value={albumDescription}
                                        onChange={(e) => setAlbumDescription(e.target.value)}
                                        placeholder="Optional description of your album"
                                        rows={4}
                                    />
                                </div>

                                <div className="text-sm text-slate-500">
                                    <p>
                                        Albums help you organize registered people. You can create multiple albums
                                        for different purposes, like family members, community groups, or events.
                                    </p>
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-between bg-slate-50 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    className="border-gray"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isSubmitting || !albumName.trim()}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        'Create Album'
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                </div>
            </Layout>
        </>
    );
}