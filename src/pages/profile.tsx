import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { RefreshCw, Camera, UserCircle, LucideLogOut, Edit, Users } from 'lucide-react';
import CameraCapture from '@/components/capture/CameraCapture';
import ResidentialPathDisplay from '@/components/location/ResidentialPathDisplay';

// Define the User type
interface User {
    id: string;
    email: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    gender?: string;
    profileImageUrl?: string;
    residentialPath?: string;
    dateOfBirth?: string;
    // Additional fields
    occupation?: string;
    religion?: string;
    denomination?: string;
    clan?: string;
}

// Define the Person type for registered people
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
}

export default function ProfilePage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('profile');
    const [registeredPeople, setRegisteredPeople] = useState<Person[]>([]);
    const [showCameraCapture, setShowCameraCapture] = useState(false);

    // Check authentication on mount
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const token = localStorage.getItem('auth_token');

                if (!token) {
                    // No token, redirect to login
                    router.push('/login');
                    return;
                }

                // Fetch user profile
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const data = await response.json();
                    setUser(data.user);

                    // Also fetch registered people
                    fetchRegisteredPeople(token);
                } else {
                    // Token invalid or expired
                    localStorage.removeItem('auth_token');
                    router.push('/login');
                }
            } catch (error) {
                console.error('Error fetching profile:', error);
                toast.error('Failed to load profile');
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserProfile();
    }, [router]);

    // Fetch people registered by the user
    const fetchRegisteredPeople = async (token: string) => {
        try {
            const response = await fetch('/api/people/registered-by-me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setRegisteredPeople(data.people || []);
            }
        } catch (error) {
            console.error('Error fetching registered people:', error);
        }
    };

    // Handle logout
    const handleLogout = () => {
        localStorage.removeItem('auth_token');
        toast.success('Logged out successfully');
        router.push('/');
    };

    // Handle face update
    const handleUpdateFace = async (imageSrc: string) => {
        setIsLoading(true);

        try {
            const token = localStorage.getItem('auth_token');

            if (!token) {
                toast.error('Authentication required');
                return;
            }

            // Update face photo
            const response = await fetch('/api/auth/update-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ image: imageSrc })
            });

            if (response.ok) {
                toast.success('Face photo updated successfully');

                // Update user data
                const data = await response.json();
                setUser(prev => prev ? {...prev, profileImageUrl: data.profileImageUrl} : null);

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

    // Get full name
    const getFullName = (person: User | Person) => {
        const parts = [
            person.firstName || '',
            person.middleName || '',
            person.lastName || ''
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(' ') : 'No Name';
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
            <Layout title="Login User Profile Page" showHistory={false}>
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 flex flex-col md:flex-row items-center md:items-start gap-6">
                        {/* Profile photo card */}
                        <Card className="w-full md:w-1/3 border-none shadow-lg">
                            <CardContent className="p-6 text-center">
                                <div className="mb-6">
                                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100 relative">
                                        {user.profileImageUrl ? (
                                            <img
                                                src={user.profileImageUrl}
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

                                        <Button
                                            size="sm"
                                            className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0 bg-indigo-600 text-white"
                                            onClick={() => setShowCameraCapture(true)}
                                        >
                                            <Camera size={16} />
                                        </Button>
                                    </div>
                                    <h2 className="text-xl font-bold mt-4">{getFullName(user)}</h2>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </div>

                                <Button
                                    variant="outline"
                                    className="w-full flex items-center justify-center text-red-600 hover:bg-red-50 hover:text-red-700"
                                    onClick={handleLogout}
                                >
                                    <LucideLogOut size={16} className="mr-2" />
                                    Logout
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Main content card */}
                        <Card className="w-full md:w-2/3 border-none shadow-lg">
                            <CardHeader className="px-6 pt-6 pb-2">
                                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                    <TabsList className="grid w-full grid-cols-2">
                                        <TabsTrigger value="profile" className="flex items-center gap-2">
                                            <UserCircle size={16} />
                                            <span>Profile</span>
                                        </TabsTrigger>
                                        <TabsTrigger value="people" className="flex items-center gap-2">
                                            <Users size={16} />
                                            <span>Registered People</span>
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>

                            <CardContent className="px-6 py-4">
                                <TabsContent value="profile" className="mt-2 space-y-4">
                                    {showCameraCapture ? (
                                        <div className="mb-4">
                                            <h3 className="text-lg font-medium mb-2">Update Your Face Photo</h3>
                                            <CameraCapture onCapture={handleUpdateFace} />

                                            <div className="mt-4 flex justify-end">
                                                <Button
                                                    variant="outline"
                                                    onClick={() => setShowCameraCapture(false)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
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
                                                            <p>{user.dateOfBirth || 'Not provided'}</p>
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

                                                {user.residentialPath && (
                                                    <ResidentialPathDisplay path={user.residentialPath} />
                                                )}

                                                <div className="pt-4 flex justify-end">
                                                    <Button className="flex items-center bg-indigo-600 hover:bg-indigo-700">
                                                        <Edit size={16} className="mr-2" />
                                                        Edit Profile
                                                    </Button>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </TabsContent>

                                <TabsContent value="people" className="mt-2">
                                    <div className="mb-4 flex justify-between items-center">
                                        <h3 className="text-lg font-medium">People You've Registered</h3>
                                        <Button className="flex items-center bg-indigo-600 hover:bg-indigo-700">
                                            <Users size={16} className="mr-2" />
                                            Register New Person
                                        </Button>
                                    </div>

                                    {registeredPeople.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-md">
                                            <p className="text-slate-500">You haven't registered any people yet.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {registeredPeople.map(person => (
                                                <Card key={person.id} className="overflow-hidden">
                                                    <CardContent className="p-4">
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-100">
                                                                {person.s3ImagePath ? (
                                                                    <img
                                                                        src={person.s3ImagePath}
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
                                                        <Button size="sm" variant="ghost" className="text-indigo-600 hover:text-indigo-700">
                                                            View Details
                                                        </Button>
                                                    </CardFooter>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </TabsContent>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </Layout>
        </>
    );
}