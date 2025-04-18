import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { useAuthStore } from '@/store/auth-store';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FolderSelector from '@/components/capture/FolderSelector';
import { RefreshCw, Camera, Upload, CheckCircle, X } from 'lucide-react';
import SimpleCameraCapture from '@/components/capture/SimpleCameraCapture';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

// Registration steps
enum RegistrationStep {
    SELECT_ALBUM = 0,
    CAPTURE_PHOTO = 1,
    PERSON_INFO = 2,
    CONFIRMATION = 3
}

// Album structure
interface Album {
    id: string;
    name: string;
}

export default function FaceRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<RegistrationStep>(RegistrationStep.SELECT_ALBUM);
    const [isLoading, setIsLoading] = useState(true);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [albums, setAlbums] = useState<Album[]>([]);
    const [showCreateAlbumDialog, setShowCreateAlbumDialog] = useState(false);
    const [newAlbumName, setNewAlbumName] = useState('');
    const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
    const [uploadMode, setUploadMode] = useState(false);

    // Person data
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

    // Get auth state from Zustand store
    const { isLoggedIn } = useAuthStore();

    // Check if user is logged in
    useEffect(() => {
        if (!isLoggedIn) {
            toast.error('Please log in to register people');
            router.push('/login');
            return;
        }

        // Fetch user's albums
        fetchAlbums();
    }, [isLoggedIn, router]);

    // Fetch user's albums
    const fetchAlbums = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/albums/list');

            if (response.ok) {
                const data = await response.json();
                setAlbums(data.albums);

                // If user has albums, select the first one by default
                if (data.albums.length > 0) {
                    setSelectedAlbumId(data.albums[0].id);
                }
            } else {
                toast.error('Failed to fetch albums');
            }
        } catch (error) {
            console.error('Error fetching albums:', error);
            toast.error('An error occurred while fetching albums');
        } finally {
            setIsLoading(false);
        }
    };

    // Create a new album
    const handleCreateAlbum = async () => {
        if (!newAlbumName.trim()) {
            toast.error('Please enter an album name');
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch('/api/albums/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: newAlbumName.trim() }),
            });

            if (response.ok) {
                const data = await response.json();
                toast.success('Album created successfully');
                setAlbums([...albums, data.album]);
                setSelectedAlbumId(data.album.id);
                setShowCreateAlbumDialog(false);
                setNewAlbumName('');
            } else {
                const data = await response.json();
                toast.error(data.message || 'Failed to create album');
            }
        } catch (error) {
            console.error('Error creating album:', error);
            toast.error('An error occurred while creating the album');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle image capture
    const handleCapture = async (imageSrc: string) => {
        try {
            // Check if face is detected
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
                moveToNextStep();
            } else {
                toast.error('No face detected. Please try again with a clearer photo.');
            }
        } catch (error) {
            console.error('Face detection error:', error);
            toast.error('Error detecting face. Please try again.');
        }
    };

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (!e.target?.result) return;

            const imageSrc = e.target.result as string;

            try {
                // Check if face is detected
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
                    moveToNextStep();
                } else {
                    toast.error('No face detected in the uploaded image. Please try a different photo.');
                }
            } catch (error) {
                console.error('Face detection error:', error);
                toast.error('Error detecting face in the uploaded image');
            }
        };
        reader.readAsDataURL(file);
    };

    // Move to next registration step
    const moveToNextStep = () => {
        setCurrentStep(prev => {
            const nextStep = prev + 1;
            return nextStep as RegistrationStep;
        });
    };

    // Move to previous registration step
    const moveToPreviousStep = () => {
        setCurrentStep(prev => {
            const prevStep = prev - 1;
            return prevStep as RegistrationStep;
        });
    };

    // Handle registration submission
    const handleSubmit = async () => {
        if (!capturedImage || !selectedAlbumId) {
            toast.error('Missing required information');
            return;
        }

        // Validate required fields
        if (!firstName || !lastName) {
            toast.error('First name and last name are required');
            return;
        }

        setIsLoading(true);

        try {
            // Register the person
            const response = await fetch('/api/people/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    firstName,
                    middleName,
                    lastName,
                    gender,
                    dateOfBirth,
                    occupation,
                    religion,
                    denomination,
                    clan,
                    residentialPath,
                    albumId: selectedAlbumId,
                    image: capturedImage
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Person registered successfully');
                moveToNextStep(); // Move to confirmation step
            } else {
                toast.error(data.message || 'Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('An error occurred during registration');
        } finally {
            setIsLoading(false);
        }
    };

    // Render step content based on current step
    const renderStepContent = () => {
        switch (currentStep) {
            case RegistrationStep.SELECT_ALBUM:
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Select or Create an Album</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-4">
                                <p>
                                    You need to select an album to store the person&#39;s photo. You can also create a new album.
                                </p>
                            </div>

                            {albums.length > 0 ? (
                                <div className="space-y-4">
                                    <Label htmlFor="albumSelect">Select an album</Label>
                                    <Select
                                        value={selectedAlbumId}
                                        onValueChange={setSelectedAlbumId}
                                    >
                                        <SelectTrigger id="albumSelect">
                                            <SelectValue placeholder="Select an album" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {albums.map(album => (
                                                <SelectItem key={album.id} value={album.id}>{album.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ) : (
                                <div className="p-4 bg-slate-50 rounded-md text-center text-slate-600">
                                    <p>You don&#39;t have any albums yet. Please create one.</p>
                                </div>
                            )}

                            <div className="mt-6">
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    onClick={() => setShowCreateAlbumDialog(true)}
                                >
                                    Create New Album
                                </Button>
                            </div>

                            <div className="flex justify-end mt-6">
                                <Button
                                    onClick={moveToNextStep}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={!selectedAlbumId}
                                >
                                    Continue
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.CAPTURE_PHOTO:
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Take a Photo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-4">
                                <p>
                                    Take a clear photo of the person you want to register or upload an image.
                                </p>
                            </div>

                            <div className="flex justify-center space-x-4 mb-6">
                                <Button
                                    variant={!uploadMode ? "default" : "outline"}
                                    onClick={() => setUploadMode(false)}
                                    className="flex items-center"
                                >
                                    <Camera size={16} className="mr-2" />
                                    Use Camera
                                </Button>
                                <Button
                                    variant={uploadMode ? "default" : "outline"}
                                    onClick={() => setUploadMode(true)}
                                    className="flex items-center"
                                >
                                    <Upload size={16} className="mr-2" />
                                    Upload Photo
                                </Button>
                            </div>

                            {!uploadMode ? (
                                <SimpleCameraCapture onCapture={handleCapture} />
                            ) : (
                                <div className="text-center">
                                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 mb-4">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileUpload}
                                            className="hidden"
                                            id="file-upload"
                                        />
                                        <label
                                            htmlFor="file-upload"
                                            className="cursor-pointer flex flex-col items-center justify-center"
                                        >
                                            <Upload size={48} className="text-slate-400 mb-2" />
                                            <span className="text-slate-600">Click to upload a photo</span>
                                            <span className="text-sm text-slate-500">JPG, PNG, etc.</span>
                                        </label>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between mt-6">
                                <Button
                                    variant="outline"
                                    onClick={moveToPreviousStep}
                                >
                                    Back
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.PERSON_INFO:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Enter Person Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="mb-6 flex justify-center">
                                {capturedImage && (
                                    <div className="mb-4">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Person photo"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                {/* Basic information */}
                                <div className="grid grid-cols-1 gap-4">
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
                                            <Label htmlFor="lastName">Last Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="lastName"
                                                value={lastName}
                                                onChange={(e) => setLastName(e.target.value)}
                                                placeholder="Last Name"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gender">Gender</Label>
                                            <Select value={gender} onValueChange={setGender}>
                                                <SelectTrigger>
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
                                            <Select value={religion} onValueChange={setReligion}>
                                                <SelectTrigger>
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

                                {/* PNG Residential Address */}
                                <div className="mt-4">
                                    <h3 className="font-medium">PNG Residential Address</h3>
                                    <div className="space-y-2 mt-2">
                                        <FolderSelector
                                            onFolderSelect={(folders) => {
                                                if (folders.length > 0) {
                                                    setResidentialPath(folders[0]);
                                                }
                                            }}
                                            initialSelected={residentialPath ? [residentialPath] : []}
                                            minLevel={2}
                                        />
                                        <p className="text-xs text-slate-500">
                                            Please select the person&#39;s location down to at least the district level.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button
                                    variant="outline"
                                    onClick={moveToPreviousStep}
                                >
                                    Back
                                </Button>

                                <Button
                                    onClick={handleSubmit}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        'Register Person'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.CONFIRMATION:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Registration Complete</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 text-center">
                            <div className="mx-auto rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>

                            <h2 className="text-xl font-bold mb-4">Success!</h2>
                            <p className="mb-6">
                                The person has been successfully registered to your album and added to the PNG collection.
                            </p>

                            <div className="flex justify-center space-x-4">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        // Reset form and go back to first step
                                        setCapturedImage(null);
                                        setFirstName('');
                                        setMiddleName('');
                                        setLastName('');
                                        setGender('');
                                        setDateOfBirth('');
                                        setOccupation('');
                                        setReligion('');
                                        setDenomination('');
                                        setClan('');
                                        setResidentialPath('');
                                        setCurrentStep(RegistrationStep.SELECT_ALBUM);
                                    }}
                                >
                                    Register Another Person
                                </Button>
                                <Button
                                    onClick={() => router.push('/profile')}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Go to Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return null;
        }
    };

    if (isLoading && currentStep === RegistrationStep.SELECT_ALBUM) {
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
                <title>Register a Person - PNG Pess Book</title>
                <meta name="description" content="Register a person to PNG Pess Book" />
            </Head>
            <Layout title="Register a Person" showHistory={false} showNewSearch={false}>
                <div className="max-w-3xl mx-auto">
                    {/* Steps indicator */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center relative">
                            {[1, 2, 3, 4].map((step) => {
                                let isActive = false;
                                let isCompleted = false;

                                if (currentStep === step - 1) isActive = true;
                                if (currentStep > step - 1) isCompleted = true;

                                return (
                                    <div
                                        key={step}
                                        className={`flex flex-col items-center ${isActive || isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                            isCompleted
                                                ? 'bg-indigo-600 text-white'
                                                : isActive
                                                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {step}
                                        </div>
                                        <span className="text-xs block whitespace-nowrap">
                      {step === 1 && "Select Album"}
                                            {step === 2 && "Take Photo"}
                                            {step === 3 && "Person Info"}
                                            {step === 4 && "Confirmation"}
                    </span>
                                    </div>
                                );
                            })}
                            {/* Connecting lines */}
                            <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 -z-10"></div>
                        </div>
                    </div>

                    {renderStepContent()}
                </div>
            </Layout>

            {/* Create Album Dialog */}
            <Dialog open={showCreateAlbumDialog} onOpenChange={setShowCreateAlbumDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create New Album</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="albumName">Album Name</Label>
                            <Input
                                id="albumName"
                                value={newAlbumName}
                                onChange={(e) => setNewAlbumName(e.target.value)}
                                placeholder="Enter album name"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex space-x-2 justify-between">
                        <Button variant="outline" onClick={() => setShowCreateAlbumDialog(false)}>
                            <X size={16} className="mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateAlbum}
                            disabled={isLoading || !newAlbumName.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            {isLoading ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Album'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}