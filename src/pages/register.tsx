import { useState } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import FolderSelector from '@/components/capture/FolderSelector';
import LoadingSkeleton from '@/components/loading';
import { RefreshCw, CheckCircle, Home } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type RegistrationStep = 'face-check' | 'face-match-result' | 'registration-form' | 'location-selection' | 'complete';

export default function UserRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<RegistrationStep>('face-check');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [faceId, setFaceId] = useState<string | null>(null);
    const [faceMatchConfidence, setFaceMatchConfidence] = useState<number | null>(null);
    const [existingFaceData, setExistingFaceData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Form data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState('');
    const [residentialPath, setResidentialPath] = useState('');
    const [phone, setPhone] = useState('');
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
    const [selectedCollections, setSelectedCollections] = useState<string[]>(['PNG']);

    // Handle face capture
    const handleCapture = async (imageSrc: string, mode: 'match' | 'register') => {
        setCapturedImage(imageSrc);
        setIsLoading(true);

        try {
            // Call API to check if face exists in the system
            const response = await fetch('/api/auth/validate-face', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            const data = await response.json();

            if (response.ok) {
                // Face found and matched to an existing user
                toast.success('Face recognized! Welcome back.');
                setExistingFaceData(data);

                // Store the auth token if it's in the response and redirect to home or profile
                router.push('/profile');
            } else if (response.status === 404 && data.faceId) {
                // Face found in collection but not linked to a user account
                toast.info('New user registration with existing face.');
                setFaceId(data.faceId);
                setFaceMatchConfidence(data.faceConfidence || null);
                setCurrentStep('registration-form');
            } else {
                // No face match found, proceed with new registration
                toast.info('No matching face found. Please complete registration.');
                setCurrentStep('registration-form');
            }
        } catch (error) {
            console.error('Error during face validation:', error);
            toast.error('Face validation failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle form submission
    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!email || !password || !confirmPassword || !firstName || !lastName) {
            toast.error('Please fill in all required fields');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setIsLoading(true);

        try {
            // Move to location selection
            setCurrentStep('location-selection');
        } finally {
            setIsLoading(false);
        }
    };

    // Handle location selection
    const handleFolderSelect = (paths: string[]) => {
        setSelectedFolders(paths);
        setResidentialPath(paths.length > 0 ? paths[0] : '');
    };

    // Final registration submission
    const handleFinalSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!residentialPath) {
            toast.error('Please select a residential location');
            return;
        }

        setIsLoading(true);

        try {
            // Register user with API
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    password,
                    firstName,
                    middleName,
                    lastName,
                    gender,
                    faceId,
                    residentialPath,
                    phone,
                    image: capturedImage,
                    collections: selectedCollections
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Registration successful!');
                setCurrentStep('complete');
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

    // Handle collection selection
    const handleCollectionChange = (collection: string, isChecked: boolean) => {
        if (isChecked) {
            setSelectedCollections(prev => [...prev, collection]);
        } else {
            setSelectedCollections(prev => prev.filter(c => c !== collection));
        }
    };

    // Handle going back to previous step
    const handleBack = () => {
        if (currentStep === 'registration-form') {
            setCurrentStep('face-check');
        } else if (currentStep === 'location-selection') {
            setCurrentStep('registration-form');
        }
    };

    const renderContent = () => {
        switch (currentStep) {
            case 'face-check':
                return (
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-center">Step 1: Face Verification</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                                Please take a selfie to check if you're already registered or to register for the first time.
                            </p>
                            <CameraCapture onCapture={handleCapture} />
                        </CardContent>
                    </Card>
                );

            case 'registration-form':
                return (
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-center">Step 2: Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {capturedImage && (
                                <div className="text-center mb-6">
                                    <div className="w-32 h-32 mx-auto relative">
                                        <div className="absolute inset-0 rounded-full overflow-hidden">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                    {faceId && faceMatchConfidence && (
                                        <p className="text-sm text-slate-500 mt-2">
                                            Face detected with {faceMatchConfidence.toFixed(1)}% confidence
                                        </p>
                                    )}
                                </div>
                            )}

                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                {/* Personal Info Section */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300">Personal Information</h3>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="firstName"
                                                value={firstName}
                                                onChange={(e) => setFirstName(e.target.value)}
                                                placeholder="First Name"
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="middleName">Middle Name</Label>
                                            <Input
                                                id="middleName"
                                                value={middleName}
                                                onChange={(e) => setMiddleName(e.target.value)}
                                                placeholder="Middle Name"
                                                disabled={isLoading}
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
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="gender">Gender</Label>
                                            <Select value={gender} onValueChange={setGender}>
                                                <SelectTrigger id="gender" disabled={isLoading}>
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
                                            <Label htmlFor="phone">Phone Number</Label>
                                            <Input
                                                id="phone"
                                                value={phone}
                                                onChange={(e) => setPhone(e.target.value)}
                                                placeholder="Phone Number"
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Collection Selection Section */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300">Collection Membership</h3>
                                    <p className="text-sm text-slate-500">Select which collections you belong to:</p>

                                    <div className="space-y-2 border rounded-md p-3 bg-slate-50 dark:bg-slate-800/50">
                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="png-collection"
                                                checked={selectedCollections.includes('PNG')}
                                                onChange={(e) => handleCollectionChange('PNG', e.target.checked)}
                                                className="w-4 h-4 text-indigo-600"
                                                disabled
                                            />
                                            <Label htmlFor="png-collection" className="ml-2">
                                                PNG Pess Book (Default)
                                            </Label>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="abg-collection"
                                                checked={selectedCollections.includes('ABG')}
                                                onChange={(e) => handleCollectionChange('ABG', e.target.checked)}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <Label htmlFor="abg-collection" className="ml-2">
                                                ABG (Autonomous Region of Bougainville)
                                            </Label>
                                        </div>

                                        <div className="flex items-center">
                                            <input
                                                type="checkbox"
                                                id="mka-collection"
                                                checked={selectedCollections.includes('MKA')}
                                                onChange={(e) => handleCollectionChange('MKA', e.target.checked)}
                                                className="w-4 h-4 text-indigo-600"
                                            />
                                            <Label htmlFor="mka-collection" className="ml-2">
                                                MKA (Motu Koitabu Assembly)
                                            </Label>
                                        </div>
                                    </div>
                                </div>

                                {/* Account Info Section */}
                                <div className="space-y-4">
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300">Account Information</h3>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
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

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Password <span className="text-red-500">*</span></Label>
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

                                        <div className="space-y-2">
                                            <Label htmlFor="confirmPassword">Confirm Password <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="confirmPassword"
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="Confirm Password"
                                                required
                                                disabled={isLoading}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-between pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                        disabled={isLoading}
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw size={16} className="mr-2 animate-spin" />
                                                Processing...
                                            </>
                                        ) : (
                                            'Next: Select Location'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'location-selection':
                return (
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-center">Step 3: Residential Location</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                                Please select your residential location. This helps others find you in the system.
                            </p>

                            <form onSubmit={handleFinalSubmit} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="font-medium text-slate-700 dark:text-slate-300 flex items-center">
                                        <Home size={18} className="mr-2" />
                                        Residential Location
                                    </h3>

                                    <FolderSelector
                                        onFolderSelect={handleFolderSelect}
                                        initialSelected={selectedFolders}
                                    />

                                    {selectedFolders.length > 0 && (
                                        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-md border">
                                            <h4 className="font-medium text-sm mb-2">Selected Location:</h4>
                                            <p className="text-sm">{selectedFolders[0]}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Buttons */}
                                <div className="flex justify-between pt-4">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={handleBack}
                                        disabled={isLoading}
                                    >
                                        Back
                                    </Button>

                                    <Button
                                        type="submit"
                                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                        disabled={isLoading || selectedFolders.length === 0}
                                    >
                                        {isLoading ? (
                                            <>
                                                <RefreshCw size={16} className="mr-2 animate-spin" />
                                                Registering...
                                            </>
                                        ) : (
                                            'Complete Registration'
                                        )}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                );

            case 'complete':
                return (
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardHeader>
                            <div className="flex justify-center mb-4">
                                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                                    <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                                </div>
                            </div>
                            <CardTitle className="text-center">Registration Complete!</CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-slate-600 dark:text-slate-400 mb-6">
                                Thank you for registering with PNG Pess Book. A confirmation email has been sent to your email address.
                            </p>

                            <div className="my-6">
                                <p className="text-sm font-medium mb-2">Your residential location:</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">
                                    {residentialPath || 'No location selected'}
                                </p>
                            </div>

                            <div className="flex justify-center space-x-4">
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                >
                                    Login Now
                                </Button>

                                <Button
                                    variant="outline"
                                    onClick={() => router.push('/')}
                                >
                                    Return to Home
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            default:
                return <LoadingSkeleton />;
        }
    };

    return (
        <Layout title="User Registration" showHistory={false} showNewSearch={false}>
            <div className="max-w-2xl mx-auto">
                {renderContent()}
            </div>
        </Layout>
    );
}