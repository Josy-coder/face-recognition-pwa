import {useState, useEffect, useCallback, useRef} from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import {RefreshCw, Camera, UserCircle, LucideLogOut, Edit, Users, Save, X, PlusCircle, BookImage} from 'lucide-react';
import SimpleCameraCapture from '@/components/capture/SimpleCameraCapture';
import ResidentialPathDisplay from '@/components/location/ResidentialPathDisplay';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import FolderSelector from '@/components/capture/FolderSelector';
import { useAuthStore } from '@/store/auth-store';

// Define edit flow states
enum EditFlowState {
    IDLE = 'idle',
    LIVE_TEST = 'live_test',
    VERIFY_FACE = 'verify_face',
    EDIT = 'edit'
}

// Define the User type
interface User {
    id: string;
    email: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    profileImageUrl?: string;
    signedProfileImageUrl?: string;
    residentialPath?: string;
    dateOfBirth?: string;
    // Additional fields
    occupation?: string;
    religion?: string;
    denomination?: string;
    clan?: string;
    // Official ID fields
    nid?: string;
    electorId?: string;
    passport?: string;
    driversLicense?: string;
}

// Define the Person type for registered people
interface Person {
    signedImageUrl: any;
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

// Define the Album type
interface Album {
    id: string;
    name: string;
    description?: string;
    createdAt: string;
}

// Helper function to get direct S3 URL
const getDirectS3Url = (key: string | undefined): string | undefined => {
    if (!key) return undefined;

    // Your S3 bucket name
    const bucketName = 'facerecog-app-storage';
    const region = 'ap-southeast-2';

    // Format: https://bucket-name.s3.region.amazonaws.com/key
    return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

export default function ProfilePage() {
    const initialFetchDone = useRef(false);
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [registeredPeople, setRegisteredPeople] = useState<Person[]>([]);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [showCameraCapture, setShowCameraCapture] = useState(false);
    const [editFlowState, setEditFlowState] = useState<EditFlowState>(EditFlowState.IDLE);
    const [, setCapturedImage] = useState<string | null>(null);
    const [, setDidInitialFetch] = useState(false);

    // Form state for editing profile
    const [editedUser, setEditedUser] = useState<User | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<string>('');

    // Get auth state from Zustand store
    const { userData, isLoggedIn, isAdminLoggedIn, logout, setUser: setStoreUser } = useAuthStore();

    // Fetch user profile data - memoized to prevent infinite loops
    const fetchUserProfile = useCallback(async () => {
        try {
            setIsLoading(true);

            // Get user data from store first
            if (userData && (isLoggedIn || isAdminLoggedIn)) {
                const userWithSignedUrl = {...userData} as User;

                // Use direct S3 URL for profile image
                if (userWithSignedUrl.profileImageUrl) {
                    userWithSignedUrl.signedProfileImageUrl = getDirectS3Url(userWithSignedUrl.profileImageUrl);

                    // Update auth store
                    setStoreUser({
                        ...userData,
                        signedProfileImageUrl: userWithSignedUrl.signedProfileImageUrl
                    });
                }

                setUser(userWithSignedUrl);
                setEditedUser(userWithSignedUrl);

                if (userData.residentialPath) {
                    setSelectedLocation(userData.residentialPath);
                }

                // Only fetch registered people and albums for regular users
                if (isLoggedIn && !isAdminLoggedIn) {
                    await fetchRegisteredPeople();
                    await fetchAlbums();
                }
                setDidInitialFetch(true);
                setIsLoading(false);
                return;
            }

            // If no data in store, get the userId from the store
            const { userData: currentUser, adminData } = useAuthStore.getState();
            const userId = currentUser?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            // Fetch from API with userId
            const response = await fetch(`/api/auth/profile?userId=${userId}`);

            if (response.ok) {
                const data = await response.json();
                const user = data.user;

                // Use direct S3 URL for profile image
                if (user.profileImageUrl) {
                    user.signedProfileImageUrl = getDirectS3Url(user.profileImageUrl);
                }

                // Update local state and auth store
                setUser(user);
                setEditedUser(user);
                setStoreUser(user);

                if (user.residentialPath) {
                    setSelectedLocation(user.residentialPath);
                }

                // Only fetch registered people for regular users
                if (!data.isAdmin) {
                    await fetchRegisteredPeople();
                    await fetchAlbums();
                }

                setDidInitialFetch(true);
            } else {
                if (response.status === 401) {
                    router.push('/login');
                    return;
                }
                throw new Error('Failed to fetch profile');
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Failed to load profile');
            router.push('/login');
        } finally {
            setIsLoading(false);
        }
    }, [router, setStoreUser, isLoggedIn, isAdminLoggedIn, userData]);

    // Check authentication on mount - runs only once
    useEffect(() => {
        if (!initialFetchDone.current) {
            fetchUserProfile();
            initialFetchDone.current = true;
        }
    }, [fetchUserProfile]);

    // Get direct S3 URL for person's image
    const fetchPersonImage = async (person: Person) => {
        if (!person.s3ImagePath) return null;

        // Simply return the direct S3 URL
        return getDirectS3Url(person.s3ImagePath);
    };

    // Fetch people registered by the user
    const fetchRegisteredPeople = async () => {
        try {
            const { userData, adminData } = useAuthStore.getState();
            const userId = userData?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/people/registered-by-me?userId=${userId}`);

            if (response.ok) {
                const data = await response.json();
                const people = data.people || [];

                // Add direct URLs for each person's image
                const peopleWithUrls = await Promise.all(
                    people.map(async (person: Person) => {
                        if (person.s3ImagePath) {
                            const directUrl = getDirectS3Url(person.s3ImagePath);
                            return {
                                ...person,
                                signedImageUrl: directUrl
                            };
                        }
                        return person;
                    })
                );

                setRegisteredPeople(peopleWithUrls);
            } else {
                console.error('Failed to fetch registered people:', await response.text());
                if (response.status === 401) {
                    router.push('/login');
                }
            }
        } catch (error) {
            console.error('Error fetching registered people:', error);
            toast.error('Failed to fetch registered people');
        }
    };

    // Fetch user's albums
    const fetchAlbums = async () => {
        try {
            const { userData, adminData } = useAuthStore.getState();
            const userId = userData?.id || adminData?.id;

            if (!userId) {
                throw new Error('Not authenticated');
            }

            const response = await fetch(`/api/albums/list?userId=${userId}`);

            if (response.ok) {
                const data = await response.json();
                setAlbums(data.albums || []);
            } else {
                console.error('Failed to fetch albums:', await response.text());
            }
        } catch (error) {
            console.error('Error fetching albums:', error);
        }
    };

    // Handle logout
    const handleLogout = async () => {
        await logout();
        toast.success('Logged out successfully');
        router.push('/');
    };

    // Start the edit profile flow
    const startEditFlow = () => {
        setEditFlowState(EditFlowState.LIVE_TEST);
        toast.info('Please complete a face verification to edit your profile');
    };

    // Update profile picture
    const handleUpdateProfilePicture = async (imageSrc: string) => {
        if (!user) return;

        setIsLoading(true);

        const { userData, adminData } = useAuthStore.getState();
        const userId = userData?.id || adminData?.id;

        if (!userId) {
            toast.error('Authentication error');
            router.push('/login');
            return;
        }

        try {
            // Update face photo
            const response = await fetch('/api/auth/update-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    image: imageSrc,
                    userId: userId
                }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Face photo updated successfully');

                // Get a direct URL for the new profile image
                const directUrl = getDirectS3Url(data.profileImageUrl);

                // Update user data in local state and store
                const updatedUser = {
                    ...user,
                    profileImageUrl: data.profileImageUrl,
                    signedProfileImageUrl: directUrl
                };

                setUser(updatedUser);
                setEditedUser(updatedUser);

                // Update auth store
                setStoreUser(updatedUser);

                // Hide camera
                setShowCameraCapture(false);
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to update face photo');
            }
        } catch (error) {
            console.error('Error updating face:', error);
            toast.error('An error occurred while updating face photo');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle input changes in edit mode
    const handleInputChange = (field: keyof User, value: string) => {
        if (!editedUser) return;

        setEditedUser({
            ...editedUser,
            [field]: value
        });
    };

    // Save edited profile
    const handleSaveProfile = async () => {
        if (!editedUser) {
            toast.error('No changes to save');
            return;
        }

        setIsLoading(true);

        try {
            // Include the selected location in the update
            const dataToUpdate = {
                ...editedUser,
                residentialPath: selectedLocation || editedUser.residentialPath
            };

            const response = await fetch('/api/auth/update-profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(dataToUpdate),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Profile updated successfully');

                // Add direct URL to user data
                if (data.user.profileImageUrl) {
                    data.user.signedProfileImageUrl = getDirectS3Url(data.user.profileImageUrl);
                }

                // Update user data in local state
                setUser(data.user);

                // Also update the auth store
                setStoreUser(data.user);

                // Reset edit state
                setEditFlowState(EditFlowState.IDLE);
                setCapturedImage(null);
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to update profile');
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('An error occurred while updating profile');
        } finally {
            setIsLoading(false);
        }
    };

    // Cancel edit mode
    const cancelEdit = () => {
        setEditFlowState(EditFlowState.IDLE);
        setCapturedImage(null);

        // Reset edited user to current user
        if (user) {
            setEditedUser(user);
        }

        if (user?.residentialPath) {
            setSelectedLocation(user.residentialPath);
        }
    };

    // Navigate to face registration page
    const goToFaceRegistration = () => {
        router.push('/register-person');
    };

    // Navigate to create album page
    const goToCreateAlbum = () => {
        router.push('/albums/create');
    };

    // Get full name
    const getFullName = (person: User | Person) => {
        const parts = [
            person.firstName || '',
            person.middleName || '',
            person.lastName || ''
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(' ') : 'No Name';
    };

    // Render content based on edit flow state
    const renderEditFlowContent = () => {
        switch (editFlowState) {
            case EditFlowState.LIVE_TEST:
                return (
                    <Card className="mb-6">
                        <CardHeader className="pb-3">
                            <h3 className="text-lg font-medium">Verify Your Identity</h3>
                            <p className="text-sm text-slate-500">
                                For security, please take a clear photo of your face to proceed with profile editing.
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">

                                <SimpleCameraCapture onCapture={async (imageSrc) => {
                                    try {
                                        // Check if face is detected using the same approach as registration
                                        const response = await fetch('/api/face-detection', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                            },
                                            body: JSON.stringify({ image: imageSrc }),
                                        });

                                        const data = await response.json();

                                        if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
                                            setCapturedImage(imageSrc);
                                            // Skip the VERIFY_FACE step and go straight to EDIT
                                            setEditFlowState(EditFlowState.EDIT);
                                        } else {
                                            toast.error('No face detected. Please try again with a clearer photo.');
                                        }
                                    } catch (error) {
                                        console.error('Face detection error:', error);
                                        toast.error('Error detecting face. Please try again.');
                                    }
                                }} />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-end space-x-2">
                            <Button variant="ghost" className="border border-gray" onClick={cancelEdit}>
                                Cancel
                            </Button>
                        </CardFooter>
                    </Card>
                );

            case EditFlowState.VERIFY_FACE:
                return null;

            case EditFlowState.EDIT:
                return editedUser ? (
                    <div className="space-y-6">
                        <Card className="border-none overflow-hidden">
                            <CardHeader className="bg-slate-50">
                                <h3 className="text-lg font-medium">Edit Profile Information</h3>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="space-y-6">
                                    {/* Profile photo update */}
                                    <div className="flex justify-center">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100">
                                                {editedUser.signedProfileImageUrl ? (
                                                    <img
                                                        src={editedUser.signedProfileImageUrl}
                                                        alt={getFullName(editedUser)}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            // Fallback if image fails to load
                                                            (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                        }}
                                                    />
                                                ) : (
                                                    <UserCircle className="w-full h-full text-slate-300" />
                                                )}
                                            </div>

                                            <Button
                                                size="sm"
                                                className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-indigo-600 text-white"
                                                onClick={() => setShowCameraCapture(prev => !prev)}
                                            >
                                                <Camera size={16} />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Camera capture for updating photo */}
                                    {showCameraCapture && (
                                        <div className="mt-4">
                                            <SimpleCameraCapture onCapture={handleUpdateProfilePicture} />

                                            <div className="mt-2 flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setShowCameraCapture(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Basic information form */}
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-firstName">First Name</Label>
                                                <Input
                                                    id="edit-firstName"
                                                    value={editedUser.firstName || ''}
                                                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                                                    placeholder="First Name"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-middleName">Middle Name</Label>
                                                <Input
                                                    id="edit-middleName"
                                                    value={editedUser.middleName || ''}
                                                    onChange={(e) => handleInputChange('middleName', e.target.value)}
                                                    placeholder="Middle Name"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-lastName">Last Name</Label>
                                                <Input
                                                    id="edit-lastName"
                                                    value={editedUser.lastName || ''}
                                                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                                                    placeholder="Last Name"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-gender">Gender</Label>
                                                <Select
                                                    value={editedUser.gender || ''}
                                                    onValueChange={(value) => handleInputChange('gender', value)}
                                                >
                                                    <SelectTrigger id="edit-gender">
                                                        <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Male">Male</SelectItem>
                                                        <SelectItem value="Female">Female</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-dateOfBirth">Date of Birth</Label>
                                                <Input
                                                    id="edit-dateOfBirth"
                                                    type="date"
                                                    value={editedUser.dateOfBirth?.substring(0, 10) || ''}
                                                    onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="edit-occupation">Occupation</Label>
                                                <Input
                                                    id="edit-occupation"
                                                    value={editedUser.occupation || ''}
                                                    onChange={(e) => handleInputChange('occupation', e.target.value)}
                                                    placeholder="Occupation"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-religion">Religion</Label>
                                                <Select
                                                    value={editedUser.religion || ''}
                                                    onValueChange={(value) => handleInputChange('religion', value)}
                                                >
                                                    <SelectTrigger id="edit-religion">
                                                        <SelectValue placeholder="Select Religion" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Christian">Christian</SelectItem>
                                                        <SelectItem value="Islam">Islam</SelectItem>
                                                        <SelectItem value="Other">Other</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="edit-denomination">Denomination</Label>
                                                <Input
                                                    id="edit-denomination"
                                                    value={editedUser.denomination || ''}
                                                    onChange={(e) => handleInputChange('denomination', e.target.value)}
                                                    placeholder="Denomination"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="edit-clan">Clan</Label>
                                            <Input
                                                id="edit-clan"
                                                value={editedUser.clan || ''}
                                                onChange={(e) => handleInputChange('clan', e.target.value)}
                                                placeholder="Clan"
                                            />
                                        </div>

                                        {/* Official ID section */}
                                        <div className="pt-4">
                                            <h4 className="text-md font-medium mb-3">Official Identification</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-nid">NID</Label>
                                                    <Input
                                                        id="edit-nid"
                                                        value={editedUser.nid || ''}
                                                        onChange={(e) => handleInputChange('nid', e.target.value)}
                                                        placeholder="National ID"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-electorId">Elector ID</Label>
                                                    <Input
                                                        id="edit-electorId"
                                                        value={editedUser.electorId || ''}
                                                        onChange={(e) => handleInputChange('electorId', e.target.value)}
                                                        placeholder="Elector ID"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-passport">Passport</Label>
                                                    <Input
                                                        id="edit-passport"
                                                        value={editedUser.passport || ''}
                                                        onChange={(e) => handleInputChange('passport', e.target.value)}
                                                        placeholder="Passport Number"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="edit-driversLicense">Driver&#39;s License</Label>
                                                    <Input
                                                        id="edit-driversLicense"
                                                        value={editedUser.driversLicense || ''}
                                                        onChange={(e) => handleInputChange('driversLicense', e.target.value)}
                                                        placeholder="Driver's License"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Residential Location Selector */}
                                    <div className="space-y-2">
                                        <Label>Residential Location</Label>
                                        <FolderSelector
                                            onFolderSelect={(folders) => {
                                                if (folders.length > 0) {
                                                    setSelectedLocation(folders[0]);
                                                }
                                            }}
                                            initialSelected={selectedLocation ? [selectedLocation] : []}
                                            minLevel={2} // Require at least province and district
                                        />
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between bg-slate-50 px-6 py-4">
                                <Button variant="outline" onClick={cancelEdit}>
                                    <X size={16} className="mr-2" />
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleSaveProfile}
                                    disabled={isLoading}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save size={16} className="mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                ) : null;

            default: // IDLE state
                return null;
        }
    };

    if (isLoading) {
        return (
            <Layout title="Loading Profile..." showHistory={false}>
                <div className="flex justify-center items-center h-64">
                    <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
                </div>
            </Layout>
        );
    }

    if (!user) {
        return (
            <Layout title="Profile Error" showHistory={false}>
                <Card>
                    <CardContent className="p-6 text-center">
                        <p className="mb-4">Unable to load profile. Please try logging in again.</p>
                        <Button onClick={() => router.push('/login')}>Go to Login</Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

    return (
        <>
            <Head>
                <title>My Profile - PNG Pess Book</title>
                <meta name="description" content="Your PNG Pess Book profile" />
            </Head>
            <Layout title="User Profile Page" showHistory={false}>
                <div className="max-w-4xl mx-auto">
                    {/* Render Edit Flow Content if in edit mode */}
                    {editFlowState !== EditFlowState.IDLE && renderEditFlowContent()}

                    {/* Only show normal profile view if not in edit mode */}
                    {editFlowState === EditFlowState.IDLE && (
                        <div className="mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                            {/* Profile photo card */}
                            <Card className="w-full md:w-1/3 border-none">
                                <CardContent className="p-6 text-center">
                                    <div className="mb-6">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100 relative">
                                            {user.signedProfileImageUrl ? (
                                                <img
                                                    src={user.signedProfileImageUrl}
                                                    alt={getFullName(user)}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        // Fallback if image fails to load
                                                        (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                    }}
                                                />
                                            ) : (
                                                <UserCircle className="w-full h-full text-slate-300" />
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold mt-4">{getFullName(user)}</h2>
                                        <p className="text-sm text-slate-500">{user.email}</p>
                                    </div>

                                    <Button
                                        variant="destructive"
                                        className="w-full flex items-center justify-center text-white"
                                        onClick={handleLogout}
                                    >
                                        <LucideLogOut size={16} className="mr-2" />
                                        Logout
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Main content card */}
                            <Card className="w-full md:w-2/3 border-none">
                                <CardHeader className="px-6 pt-6 pb-2">
                                    <h3 className="text-lg font-medium">Account Information</h3>
                                </CardHeader>

                                <CardContent className="px-6 py-4">
                                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                        <TabsList className="grid w-full grid-cols-3 mb-4">
                                            <TabsTrigger value="profile" className="flex items-center justify-center gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm">
                                                <UserCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span className="hidden sm:inline">Profile</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="people" className="flex items-center justify-center gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm">
                                                <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span className="hidden sm:inline">People</span>
                                            </TabsTrigger>
                                            <TabsTrigger value="albums" className="flex items-center justify-center gap-1 px-1 sm:px-3 py-2 text-xs sm:text-sm">
                                                <BookImage className="h-4 w-4 sm:h-5 sm:w-5" />
                                                <span className="hidden sm:inline">Albums</span>
                                            </TabsTrigger>
                                        </TabsList>

                                        <TabsContent value="profile" className="mt-2 space-y-4">
                                            <div className="space-y-4">
                                                <div>
                                                    <h3 className="text-lg font-medium mb-4">Personal Information</h3>

                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">First Name</p>
                                                            <p>{user.firstName || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Last Name</p>
                                                            <p>{user.lastName || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Gender</p>
                                                            <p>{user.gender || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Date of Birth</p>
                                                            <p>{user.dateOfBirth ? new Date(user.dateOfBirth).toLocaleDateString() : 'Not provided'}</p>
                                                        </div>
                                                        {user.occupation && (
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Occupation</p>
                                                                <p>{user.occupation}</p>
                                                            </div>
                                                        )}
                                                        {user.religion && (
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Religion</p>
                                                                <p>{user.religion}{user.denomination ? ` (${user.denomination})` : ''}</p>
                                                            </div>
                                                        )}
                                                        {user.clan && (
                                                            <div>
                                                                <p className="text-sm font-medium text-slate-500">Clan</p>
                                                                <p>{user.clan}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Official IDs */}
                                                <div>
                                                    <h3 className="text-lg font-medium mb-4">Official Identification</h3>
                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">NID</p>
                                                            <p>{user.nid || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Elector ID</p>
                                                            <p>{user.electorId || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Passport</p>
                                                            <p>{user.passport || 'Not provided'}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium text-slate-500">Driver&#39;s License</p>
                                                            <p>{user.driversLicense || 'Not provided'}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {user.residentialPath && (
                                                    <ResidentialPathDisplay path={user.residentialPath} />
                                                )}

                                                <div className="pt-4 flex justify-end">
                                                    <Button
                                                        className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={startEditFlow}
                                                    >
                                                        <Edit size={16} className="mr-2" />
                                                        Edit Profile
                                                    </Button>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="people" className="mt-2">
                                            <div className="mb-4 flex justify-between items-center">
                                                <h3 className="text-lg font-medium">People You&#39;ve Registered</h3>
                                                <Button
                                                    className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                                                    onClick={goToFaceRegistration}
                                                >
                                                    <PlusCircle size={16} className="mr-2" />
                                                    Register New Person
                                                </Button>
                                            </div>

                                            {registeredPeople.length === 0 ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-md">
                                                    <p className="text-slate-500">You haven&#39;t registered any people yet.</p>
                                                    <Button
                                                        className="mt-4 flex items-center mx-auto bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={goToFaceRegistration}
                                                    >
                                                        <PlusCircle size={16} className="mr-2" />
                                                        Register Your First Person
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {registeredPeople.map(person => (
                                                        <Card key={person.id} className="overflow-hidden">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                                                                        {person.signedImageUrl ? (
                                                                            <img
                                                                                src={person.signedImageUrl}
                                                                                alt={getFullName(person)}
                                                                                className="w-full h-full object-cover"
                                                                                onError={(e) => {
                                                                                    // Fallback if image fails to load
                                                                                    (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <UserCircle className="w-full h-full text-slate-300" />
                                                                        )}
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="font-medium">{getFullName(person)}</h4>
                                                                        <p className="text-sm text-slate-500">{person.gender || 'Not specified'}</p>

                                                                        {person.residentialPath && (
                                                                            <p className="text-xs text-slate-500 truncate max-w-xs">
                                                                                {person.residentialPath}
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="bg-slate-50 p-2 flex justify-end">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-indigo-600 hover:text-indigo-700"
                                                                    onClick={() => router.push(`/edit-person/${person.id}`)}
                                                                >
                                                                    Edit Details
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>

                                        <TabsContent value="albums" className="mt-2">
                                            <div className="mb-4 flex justify-between items-center">
                                                <h3 className="text-lg font-medium">My Albums</h3>
                                                <Button
                                                    className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                                                    onClick={goToCreateAlbum}
                                                >
                                                    <PlusCircle size={16} className="mr-2" />
                                                    Create New Album
                                                </Button>
                                            </div>

                                            {albums.length === 0 ? (
                                                <div className="text-center py-8 bg-slate-50 rounded-md">
                                                    <p className="text-slate-500">You haven&#39;t created any albums yet.</p>
                                                    <Button
                                                        className="mt-4 flex items-center mx-auto bg-indigo-600 hover:bg-indigo-700"
                                                        onClick={goToCreateAlbum}
                                                    >
                                                        <PlusCircle size={16} className="mr-2" />
                                                        Create Your First Album
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {albums.map(album => (
                                                        <Card key={album.id} className="overflow-hidden">
                                                            <CardContent className="p-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-16 h-16 flex items-center justify-center rounded-lg bg-slate-100">
                                                                        <Users size={24} className="text-slate-400" />
                                                                    </div>

                                                                    <div>
                                                                        <h4 className="font-medium">{album.name}</h4>
                                                                        <p className="text-sm text-slate-500">
                                                                            Created: {new Date(album.createdAt).toLocaleDateString()}
                                                                        </p>
                                                                        {album.description && (
                                                                            <p className="text-xs text-slate-500">{album.description}</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </CardContent>
                                                            <CardFooter className="bg-slate-50 p-2 flex justify-end space-x-2">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-indigo-600 hover:text-indigo-700"
                                                                    onClick={() => router.push(`/albums/${album.id}`)}
                                                                >
                                                                    View Album
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="text-indigo-600 hover:text-indigo-700"
                                                                    onClick={() => router.push(`/register-person?albumId=${album.id}`)}
                                                                >
                                                                    Add Person
                                                                </Button>
                                                            </CardFooter>
                                                        </Card>
                                                    ))}
                                                </div>
                                            )}
                                        </TabsContent>
                                    </Tabs>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            </Layout>
        </>
    );
}