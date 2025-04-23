// pages/albums/[id].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    ArrowLeft,
    RefreshCw,
    UserCircle,
    Trash2,
    Edit,
    PlusCircle,
    AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

// Album interface
interface Album {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    ownerId: string;
}

// Person interface
interface Person {
    id: string;
    firstName: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    dateOfBirth?: string;
    s3ImagePath?: string;
    residentialPath?: string;
    registeredById?: string;
    albumId?: string;
}

export default function AlbumDetailsPage() {
    const router = useRouter();
    const { id } = router.query;
    const [album, setAlbum] = useState<Album | null>(null);
    const [people, setPeople] = useState<Person[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [personToDelete, setPersonToDelete] = useState<string | null>(null);
    const [isRemovingPerson, setIsRemovingPerson] = useState(false);

    // Get auth state from Zustand store
    const { isLoggedIn, checkAuthStatus } = useAuthStore();

    // Check authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            if (!isLoggedIn) {
                await checkAuthStatus();
            }

            // If we have an ID, fetch the album data
            if (id) {
                fetchAlbumDetails();
            }
        };

        verifyAuth();
    }, [isLoggedIn, checkAuthStatus, id]);

    // Fetch album details and people
    const fetchAlbumDetails = async () => {
        if (!id) return;

        setIsLoading(true);

        try {
            const { userData, adminData } = useAuthStore.getState();
            const userId = userData?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/albums/details?id=${id}&userId=${userId}`);

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to login
                    toast.error('Please log in to view this album');
                    router.push('/login');
                    return;
                }

                if (response.status === 404) {
                    // Album not found
                    toast.error('Album not found');
                    router.push('/profile?tab=albums');
                    return;
                }

                throw new Error('Failed to fetch album details');
            }

            const data = await response.json();
            setAlbum(data.album);
            setPeople(data.album.people || []);

        } catch (error) {
            console.error('Error fetching album details:', error);
            toast.error('Failed to load album details');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle album deletion
    const handleDeleteAlbum = async () => {
        if (!album) return;

        setIsDeleting(true);

        try {
            const { userData, adminData } = useAuthStore.getState();
            const userId = userData?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/albums/delete?id=${album.id}&userId=${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete album');
            }

            toast.success('Album deleted successfully');
            router.push('/profile?tab=albums');

        } catch (error) {
            console.error('Error deleting album:', error);
            toast.error('Failed to delete album');
        } finally {
            setIsDeleting(false);
            setShowDeleteDialog(false);
        }
    };

    // Handle removing a person from the album
    const handleRemovePerson = async () => {
        if (!personToDelete) return;

        setIsRemovingPerson(true);

        try {
            const response = await fetch(`/api/people/update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: personToDelete,
                    albumId: null // Remove from album
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to remove person from album');
            }

            toast.success('Person removed from album');

            // Update the local state to reflect the change
            setPeople(people.filter(person => person.id !== personToDelete));

        } catch (error) {
            console.error('Error removing person from album:', error);
            toast.error('Failed to remove person from album');
        } finally {
            setIsRemovingPerson(false);
            setPersonToDelete(null);
        }
    };

    // Navigate to register person page with this album pre-selected
    const goToRegisterPerson = () => {
        if (!album) return;
        router.push(`/register-person?albumId=${album.id}`);
    };

    // Get full name for a person
    const getFullName = (person: Person): string => {
        const parts = [
            person.firstName || '',
            person.middleName || '',
            person.lastName || ''
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(' ') : 'Unnamed Person';
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleDateString();
    };

    if (isLoading) {
        return (
            <Layout title="Loading Album..." showHistory={false} showNewSearch={false}>
                <div className="flex justify-center items-center h-64">
                    <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!album) {
        return (
            <Layout title="Album Not Found" showHistory={false} showNewSearch={false}>
                <Card className="max-w-xl mx-auto border-none">
                    <CardContent className="p-6 text-center">
                        <AlertCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
                        <h2 className="text-xl font-semibold mb-2">Album Not Found</h2>
                        <p className="text-slate-500 mb-6">
                            The album you are looking for doesn't exist or you don't have permission to view it.
                        </p>
                        <Button
                            onClick={() => router.push('/profile?tab=albums')}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Go to Your Albums
                        </Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

    return (
        <>
            <Head>
                <title>{album.name} - Album Details - PNG Pess Book</title>
                <meta name="description" content={`Details for album ${album.name}`} />
            </Head>
            <Layout title={album.name} showHistory={false} showNewSearch={false}>
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 flex justify-between items-center">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/profile?tab=albums')}
                            className="flex items-center"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Albums
                        </Button>

                        <div className="flex space-x-2">
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-black dark:text-white hover:text-red-600 hover:bg-red-50 border-red-200"
                            >
                                <Trash2 size={16} className="mr-2" />
                                Delete Album
                            </Button>
                        </div>
                    </div>

                    <Card className="border-none shadow-md overflow-hidden mb-8">
                        <CardHeader className="bg-slate-50">
                            <CardTitle className="text-xl">Album Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Name</h3>
                                    <p className="font-medium">{album.name}</p>
                                </div>

                                {album.description && (
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-500">Description</h3>
                                        <p>{album.description}</p>
                                    </div>
                                )}

                                <div>
                                    <h3 className="text-sm font-medium text-slate-500">Created</h3>
                                    <p>{formatDate(album.createdAt)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="mb-6 flex justify-between items-center">
                        <h2 className="text-xl font-semibold">People in this Album</h2>
                        <Button
                            onClick={goToRegisterPerson}
                            className="bg-indigo-600 hover:bg-indigo-700 flex items-center"
                        >
                            <PlusCircle size={16} className="mr-2" />
                            Add Person to Album
                        </Button>
                    </div>

                    {people.length === 0 ? (
                        <Card className="border-none shadow-md overflow-hidden">
                            <CardContent className="p-8 text-center">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserCircle className="h-10 w-10 text-slate-400" />
                                </div>
                                <h3 className="text-lg font-medium mb-2">No People Yet</h3>
                                <p className="text-slate-500 mb-6">
                                    This album doesn't have any people registered yet.
                                </p>
                                <Button
                                    onClick={goToRegisterPerson}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Register a Person
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {people.map(person => (
                                <Card key={person.id} className="border overflow-hidden">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                                                {person.s3ImagePath ? (
                                                    <img
                                                        src={person.s3ImagePath}
                                                        alt={getFullName(person)}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                        }}
                                                    />
                                                ) : (
                                                    <UserCircle className="w-full h-full text-slate-300" />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-medium truncate">{getFullName(person)}</h3>

                                                {person.residentialPath && (
                                                    <p className="text-xs text-slate-500 truncate">
                                                        {person.residentialPath}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                    <CardFooter className="bg-slate-50 p-2 flex justify-end space-x-2">
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-indigo-600 hover:text-indigo-700"
                                            onClick={() => router.push(`/edit-person/${person.id}`)}
                                        >
                                            <Edit size={14} className="mr-1" />
                                            Edit
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => setPersonToDelete(person.id)}
                                        >
                                            <Trash2 size={14} className="mr-1" />
                                            Remove
                                        </Button>
                                    </CardFooter>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </Layout>

            {/* Delete Album Confirmation Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent className="bg-white dark:bg-slate-800 text-black dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Delete Album</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this album? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <p className="text-amber-500 flex items-start gap-2 text-sm">
                            <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
                            <span>
                                People in this album will not be deleted, but they will no longer be associated with this album.
                            </span>
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="ghost"
                            className="border-gray"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAlbum}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                'Delete Album'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Remove Person Confirmation Dialog */}
            <Dialog open={!!personToDelete} onOpenChange={(open) => !open && setPersonToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Person from Album</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to remove this person from the album?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-3">
                        <p className="text-slate-600 text-sm">
                            This will only remove the association with this album. The person's data will still be available
                            in the PNG Pess Book system.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setPersonToDelete(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleRemovePerson}
                            disabled={isRemovingPerson}
                        >
                            {isRemovingPerson ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Removing...
                                </>
                            ) : (
                                'Remove'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}