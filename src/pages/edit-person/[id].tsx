import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { useAuthStore } from '@/store/auth-store';
import { RefreshCw, ArrowLeft, Save, UserCircle, Camera } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FolderSelector from '@/components/capture/FolderSelector';
import CameraCapture from '@/components/capture/CameraCapture';

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
    // Additional fields as per feedback
    occupation?: string;
    religion?: string;
    denomination?: string;
    clan?: string;
    // Official ID fields
    nid?: string;
    electorId?: string;
    passport?: string;
    driversLicense?: string;
    // Album reference
    albumId?: string;
}

export default function EditPersonPage() {
    const router = useRouter();
    const { id } = router.query;
    const [person, setPerson] = useState<Person | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showCameraCapture, setShowCameraCapture] = useState(false);
    const [albumName, setAlbumName] = useState<string>('');

    // Form state
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [occupation, setOccupation] = useState('');
    const [religion, setReligion] = useState('');
    const [denomination, setDenomination] = useState('');
    const [clan, setClan] = useState('');
    const [residentialPath, setResidentialPath] = useState('');
    const [nid, setNid] = useState('');
    const [electorId, setElectorId] = useState('');
    const [passport, setPassport] = useState('');
    const [driversLicense, setDriversLicense] = useState('');

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

    // Fetch person details when ID is available
    useEffect(() => {
        if (id && !isLoading) {
            fetchPersonDetails();
        }
    }, [id, isLoading]);

    // Fetch person details
    const fetchPersonDetails = async () => {
        setIsLoading(true);

        try {
            // First fetch details for this person from API
            const personResponse = await fetch(`/api/people/details?id=${id}`);

            if (!personResponse.ok) {
                if (personResponse.status === 401) {
                    // Unauthorized - redirect to login
                    toast.error('Please log in to edit this person');
                    router.push('/login');
                    return;
                }

                if (personResponse.status === 404) {
                    // Person not found
                    toast.error('Person not found');
                    router.push('/profile?tab=people');
                    return;
                }

                throw new Error('Failed to fetch person details');
            }

            const personData = await personResponse.json();
            const personDetails = personData.person;

            // Set the person data
            setPerson(personDetails);

            // Initialize form fields
            setFirstName(personDetails.firstName || '');
            setMiddleName(personDetails.middleName || '');
            setLastName(personDetails.lastName || '');
            setGender(personDetails.gender || '');
            setDateOfBirth(personDetails.dateOfBirth ?
                new Date(personDetails.dateOfBirth).toISOString().split('T')[0] : '');
            setOccupation(personDetails.occupation || '');
            setReligion(personDetails.religion || '');
            setDenomination(personDetails.denomination || '');
            setClan(personDetails.clan || '');
            setResidentialPath(personDetails.residentialPath || '');
            setNid(personDetails.nid || '');
            setElectorId(personDetails.electorId || '');
            setPassport(personDetails.passport || '');
            setDriversLicense(personDetails.driversLicense || '');

            // If there's an albumId, fetch album name
            if (personDetails.albumId) {
                try {
                    const albumResponse = await fetch(`/api/albums/details?id=${personDetails.albumId}`);
                    if (albumResponse.ok) {
                        const albumData = await albumResponse.json();
                        setAlbumName(albumData.album.name);
                    }
                } catch (error) {
                    console.error('Error fetching album details:', error);
                }
            }

        } catch (error) {
            console.error('Error fetching person details:', error);
            toast.error('Failed to load person details');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firstName.trim()) {
            toast.error('First name is required');
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch(`/api/people/update?id=${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName: firstName.trim(),
                    middleName: middleName.trim() || null,
                    lastName: lastName.trim() || null,
                    gender: gender || null,
                    dateOfBirth: dateOfBirth || null,
                    occupation: occupation.trim() || null,
                    religion: religion || null,
                    denomination: denomination.trim() || null,
                    clan: clan.trim() || null,
                    residentialPath: residentialPath || null,
                    nid: nid.trim() || null,
                    electorId: electorId.trim() || null,
                    passport: passport.trim() || null,
                    driversLicense: driversLicense.trim() || null
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update person');
            }

            toast.success('Person updated successfully');

            // If this person is part of an album, go back to album page
            if (person?.albumId) {
                router.push(`/albums/${person.albumId}`);
            } else {
                // Otherwise go back to profile
                router.push('/profile?tab=people');
            }

        } catch (error) {
            console.error('Error updating person:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while updating person');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle photo update
    const handleUpdatePhoto = async (imageSrc: string) => {
        if (!person) return;

        setIsLoading(true);

        try {
            // Upload new image
            const response = await fetch(`/api/people/update-photo`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: person.id,
                    image: imageSrc
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update photo');
            }

            const data = await response.json();

            // Update local state with new photo URL
            setPerson(prev => prev ? {...prev, s3ImagePath: data.s3ImagePath} : null);

            toast.success('Photo updated successfully');
            setShowCameraCapture(false);

        } catch (error) {
            console.error('Error updating photo:', error);
            toast.error('Failed to update photo');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle location selection
    const handleLocationSelect = (locations: string[]) => {
        if (locations.length > 0) {
            setResidentialPath(locations[0]);
        }
    };

    // Handle cancellation
    const handleCancel = () => {
        router.back();
    };

    // Format date for display
    const formatDate = (dateString?: string): string => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString();
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

    if (!person) {
        return (
            <Layout title="Person Not Found" showHistory={false} showNewSearch={false}>
                <Card className="max-w-xl mx-auto border-none">
                    <CardContent className="p-6 text-center">
                        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <UserCircle className="h-10 w-10 text-amber-500" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Person Not Found</h2>
                        <p className="text-slate-500 mb-6">
                            The person you are trying to edit doesn't exist or you don't have permission to edit them.
                        </p>
                        <Button
                            onClick={() => router.push('/profile?tab=people')}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            Go to Your Registered People
                        </Button>
                    </CardContent>
                </Card>
            </Layout>
        );
    }

    return (
        <>
            <Head>
                <title>Edit Person - PNG Pess Book</title>
                <meta name="description" content="Edit person details in PNG Pess Book" />
            </Head>
            <Layout title={`Edit: ${firstName} ${lastName}`} showHistory={false} showNewSearch={false}>
                <div className="max-w-3xl mx-auto">
                    <Button
                        variant="ghost"
                        onClick={handleCancel}
                        className="mb-4 flex items-center"
                    >
                        <ArrowLeft size={16} className="mr-2" />
                        Back
                    </Button>

                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="bg-slate-50">
                            <CardTitle className="flex items-center justify-between">
                                <span>Edit Person</span>
                                {albumName && (
                                    <span className="text-sm font-normal text-slate-500">
                                        Album: {albumName}
                                    </span>
                                )}
                            </CardTitle>
                        </CardHeader>

                        <form onSubmit={handleSubmit}>
                            <CardContent className="p-6 space-y-6">
                                {/* Profile photo */}
                                <div className="flex justify-center">
                                    <div className="relative">
                                        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 bg-slate-100">
                                            {person.s3ImagePath ? (
                                                <img
                                                    src={person.s3ImagePath}
                                                    alt={`${firstName} ${lastName}`}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
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
                                            type="button"
                                            onClick={() => setShowCameraCapture(prev => !prev)}
                                        >
                                            <Camera size={16} />
                                        </Button>
                                    </div>
                                </div>

                                {/* Camera capture component if updating photo */}
                                {showCameraCapture && (
                                    <div className="mt-4">
                                        <CameraCapture onCapture={handleUpdatePhoto} />

                                        <div className="mt-2 flex justify-end">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                type="button"
                                                onClick={() => setShowCameraCapture(false)}
                                            >
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Basic information */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Personal Details</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="First Name"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="middleName">Middle Name</Label>
                                            <Input
                                                id="middleName"
                                                value={middleName}
                                                onChange={(e) => setMiddleName(e.target.value)}
                                                placeholder="Middle Name"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="lastName">Last Name</Label>
                                            <Input
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Last Name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gender">Gender</Label>
                                            <Select
                                                value={gender}
                                                onValueChange={setGender}
                                            >
                                                <SelectTrigger id="gender">
                                                    <SelectValue placeholder="Select Gender" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Male">Male</SelectItem>
                                                    <SelectItem value="Female">Female</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="dateOfBirth">Date of Birth</Label>
                                            <Input
                                                id="dateOfBirth"
                                                type="date"
                                                value={dateOfBirth}
                                                onChange={(e) => setDateOfBirth(e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="occupation">Occupation</Label>
                                            <Input
                                                id="occupation"
                                                value={occupation}
                                                onChange={(e) => setOccupation(e.target.value)}
                                                placeholder="Occupation"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="religion">Religion</Label>
                                            <Select
                                                value={religion}
                                                onValueChange={setReligion}
                                            >
                                                <SelectTrigger id="religion">
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
                                            <Label htmlFor="denomination">Denomination</Label>
                                            <Input
                                                id="denomination"
                                                value={denomination}
                                                onChange={(e) => setDenomination(e.target.value)}
                                                placeholder="Denomination"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="clan">Clan</Label>
                                        <Input
                                            id="clan"
                                            value={clan}
                                            onChange={(e) => setClan(e.target.value)}
                                            placeholder="Clan"
                                        />
                                    </div>
                                </div>

                                {/* Official IDs */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Official Identification</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="nid">NID</Label>
                                            <Input
                                                id="nid"
                                                value={nid}
                                                onChange={(e) => setNid(e.target.value)}
                                                placeholder="National ID"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="electorId">Elector ID</Label>
                                            <Input
                                                id="electorId"
                                                value={electorId}
                                                onChange={(e) => setElectorId(e.target.value)}
                                                placeholder="Elector ID"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="passport">Passport</Label>
                                            <Input
                                                id="passport"
                                                value={passport}
                                                onChange={(e) => setPassport(e.target.value)}
                                                placeholder="Passport Number"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="driversLicense">Driver's License</Label>
                                            <Input
                                                id="driversLicense"
                                                value={driversLicense}
                                                onChange={(e) => setDriversLicense(e.target.value)}
                                                placeholder="Driver's License"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Residential Location */}
                                <div className="space-y-2">
                                    <Label>Residential Location</Label>
                                    <FolderSelector
                                        onFolderSelect={handleLocationSelect}
                                        initialSelected={residentialPath ? [residentialPath] : []}
                                        minLevel={2}
                                    />
                                </div>
                            </CardContent>

                            <CardFooter className="flex justify-between bg-slate-50 px-6 py-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    type="submit"
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
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
                        </form>
                    </Card>
                </div>
            </Layout>
        </>
    );
}