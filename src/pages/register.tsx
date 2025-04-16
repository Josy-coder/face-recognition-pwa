import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import LoadingSkeleton from '@/components/loading';
import { RefreshCw, CheckCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import FolderSelector from '@/components/capture/FolderSelector';
import { useAuthStore } from '@/store/auth-store';

// Registration steps based on the screenshots
enum RegistrationStep {
    USER_AGREEMENT = 0,
    LIVE_TEST = 1,
    SELECT_MEMBERSHIP = 2,
    PERSONAL_INFO = 3,
    CONFIRM_EMAIL = 4
}

export default function UserRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<RegistrationStep>(RegistrationStep.USER_AGREEMENT);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [faceId, setFaceId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, setExistingFaceData] = useState<any>(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAgreementDialog, setShowAgreementDialog] = useState(true);
    const [, setHasAgreedToTerms] = useState(false);

    // Form data
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [middleName, setMiddleName] = useState('');
    const [lastName, setLastName] = useState('');
    const [gender, setGender] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState('');
    const [occupation, setOccupation] = useState('');
    const [religion, setReligion] = useState('');
    const [denomination, setDenomination] = useState('');
    const [clan, setClan] = useState('');

    // Collection membership
    const [selectedCollections, setSelectedCollections] = useState<{[key: string]: boolean}>({
        PNG: true, // PNG Pessbook is automatic for everyone
        ABG: false,
        MKA: false
    });

    // Location selections for each collection
    const [pngLocation, setPNGLocation] = useState('');
    const [abgLocation, setABGLocation] = useState('');
    const [mkaLocation, setMKALocation] = useState('');

    // Terms agreement
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Use auth store
    const { isLoggedIn, checkAuthStatus } = useAuthStore();

    // Check if already logged in
    useEffect(() => {
        checkAuthStatus();

        if (isLoggedIn) {
            toast.info("You're already logged in!");
            router.push('/profile');
        }
    }, [isLoggedIn, router, checkAuthStatus]);

    // Check if coming from a match result
    useEffect(() => {
        if (router.query.fromMatch === 'true') {
            const matchedPersonData = localStorage.getItem('faceRecog_personData');
            if (matchedPersonData) {
                try {
                    const personData = JSON.parse(matchedPersonData);
                    // Pre-fill form with matched person data
                    setFirstName(personData.name.split(' ')[0] || '');
                    setLastName(personData.name.split(' ').slice(1).join(' ') || '');
                    // Pre-fill other fields if available
                    if (personData.details) {
                        if (personData.details.gender) setGender(personData.details.gender);
                        if (personData.details.occupation) setOccupation(personData.details.occupation);
                        if (personData.details.clan) setClan(personData.details.clan);
                        if (personData.details.religion) setReligion(personData.details.religion);
                        if (personData.details.denomination) setDenomination(personData.details.denomination);
                    }

                    // If face ID is available
                    if (personData.id) {
                        setFaceId(personData.id);
                    }

                    // Set image if available
                    if (personData.imageSrc) {
                        setCapturedImage(personData.imageSrc);
                        setFaceDetected(true);
                    }

                    // Skip to the personal info step
                    setCurrentStep(RegistrationStep.PERSONAL_INFO);
                } catch (e) {
                    console.error('Error parsing matched person data', e);
                }
            }
        }
    }, [router.query]);

    // Handle user agreement acceptance
    const handleAgreeToTerms = () => {
        setHasAgreedToTerms(true);
        setShowAgreementDialog(false);

        // Move to first step
        setCurrentStep(RegistrationStep.LIVE_TEST);
    };

    // Handle face capture
    const handleCapture = async (imageSrc: string) => {
        setCapturedImage(imageSrc);
        setIsLoading(true);

        try {
            // Perform face detection
            const response = await fetch('/api/face-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            const data = await response.json();

            if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
                setFaceDetected(true);

                // Check if face exists in the system
                await checkExistingFace(imageSrc);
            } else {
                toast.error('No face detected. Please try again with a clearer photo.');
                setFaceDetected(false);
            }
        } catch (error) {
            console.error('Face detection error:', error);
            toast.error('Error detecting face');
            setFaceDetected(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Check if the face already exists in the system
    const checkExistingFace = async (imageSrc: string) => {
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
                // Face found and matched to an existing user
                toast.info('This face is already registered in our system.');
                setExistingFaceData(data);

                // Ask if they want to login instead
                if (confirm('This face is already registered. Would you like to login instead?')) {
                    router.push('/login');
                    return;
                }
            } else if (response.status === 404 && data.faceId) {
                // Face found in collection but not linked to a user account
                setFaceId(data.faceId);
                // Skip directly to SELECT_MEMBERSHIP step
                setCurrentStep(RegistrationStep.SELECT_MEMBERSHIP);
            } else {
                // No face match found, proceed with new registration
                // Skip directly to SELECT_MEMBERSHIP step
                setCurrentStep(RegistrationStep.SELECT_MEMBERSHIP);
            }
        } catch (error) {
            console.error('Error checking face:', error);
            toast.error('Error checking face in the system');
            // Proceed to SELECT_MEMBERSHIP step anyway
            setCurrentStep(RegistrationStep.SELECT_MEMBERSHIP);
        }
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

    // Toggle collection membership
    const toggleCollection = (collection: string) => {
        setSelectedCollections(prev => ({
            ...prev,
            [collection]: !prev[collection]
        }));
    };

    // Build the full residential path for a user
    const buildResidentialPath = (): string => {
        const paths = [];

        // Add paths from selected collections
        if (selectedCollections.PNG && pngLocation) {
            paths.push(pngLocation);
        }

        if (selectedCollections.ABG && abgLocation) {
            paths.push(abgLocation);
        }

        if (selectedCollections.MKA && mkaLocation) {
            paths.push(mkaLocation);
        }

        // If no specific path selected, just use the collection names
        if (paths.length === 0) {
            if (selectedCollections.PNG) paths.push('PNG');
            if (selectedCollections.ABG) paths.push('ABG');
            if (selectedCollections.MKA) paths.push('MKA');
        }

        return paths.join(';'); // Separate multiple paths with semicolon
    };

    // Submit registration form
    const handleSubmit = async () => {
        if (!agreedToTerms) {
            toast.error('You must agree to the terms and conditions');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        // Validate required fields
        if (!firstName || !lastName || !email || !password) {
            toast.error('Please fill in all required fields');
            return;
        }

        // Validate that at least level 2 location is selected for PNG
        if (selectedCollections.PNG && (!pngLocation || pngLocation.split('/').length < 3)) {
            toast.error('Please select at least province and district for PNG Pess Book');
            return;
        }

        // Validate ABG location if selected
        if (selectedCollections.ABG && (!abgLocation || abgLocation.split('/').length < 3)) {
            toast.error('Please select at least region and district for ABG');
            return;
        }

        // Validate MKA location if selected
        if (selectedCollections.MKA && (!mkaLocation || mkaLocation.split('/').length < 3)) {
            toast.error('Please select at least area and village for MKA');
            return;
        }

        setIsLoading(true);

        try {
            // Prepare collection memberships
            const collections = Object.entries(selectedCollections)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .filter(([_, isSelected]) => isSelected)
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                .map(([collection, _]) => collection);

            // Create full residential path
            const fullResidentialPath = buildResidentialPath();

            // Register the user
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
                    dateOfBirth,
                    occupation,
                    religion,
                    denomination,
                    clan,
                    faceId,
                    residentialPath: fullResidentialPath,
                    collections,
                    image: capturedImage
                }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success('Registration successful!');
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
            case RegistrationStep.USER_AGREEMENT:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center">
                            <CardTitle>Welcome to PNG Pess Book Registration</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">1</span>
                                </div>
                                <p className="mb-4">
                                    Before you begin registration, please read and agree to our terms and conditions.
                                </p>
                            </div>

                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700"
                                onClick={() => setShowAgreementDialog(true)}
                            >
                                View User Agreement
                            </Button>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.LIVE_TEST:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center">
                            <CardTitle>Step 1: Live Person Test</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">1</span>
                                </div>
                                <p className="mb-4">Let&#39;s make sure you&#39;re a real person by taking a live photo test.</p>

                                {capturedImage && faceDetected && (
                                    <div className="mb-6">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="mt-2 flex items-center justify-center text-sm text-green-600">
                                            <CheckCircle size={16} className="mr-1" />
                                            Face detected successfully!
                                        </div>

                                        <Button
                                            onClick={() => setCurrentStep(RegistrationStep.SELECT_MEMBERSHIP)}
                                            className="mt-4 bg-indigo-600 hover:bg-indigo-700"
                                        >
                                            Continue
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <CameraCapture onCapture={handleCapture} />
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.SELECT_MEMBERSHIP:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center">
                            <CardTitle>Step 2: Select Membership Datasets</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">2</span>
                                </div>

                                {capturedImage && (
                                    <div className="mb-6">
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}

                                <p className="mb-4">Select which membership datasets you want to join.</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-center p-3 border rounded-md bg-amber-50">
                                    <Checkbox
                                        id="png-collection"
                                        checked={selectedCollections.PNG}
                                        disabled={true}
                                    />
                                    <Label htmlFor="png-collection" className="ml-2 font-medium">
                                        PNG Pessbook (Default)
                                    </Label>
                                </div>

                                <div className="flex items-center p-3 border rounded-md">
                                    <Checkbox
                                        id="abg-collection"
                                        checked={selectedCollections.ABG}
                                        onCheckedChange={() =>
                                            toggleCollection('ABG')
                                        }
                                    />
                                    <Label htmlFor="abg-collection" className="ml-2">
                                        ABG Pessbook (Autonomous Region of Bougainville)
                                    </Label>
                                </div>

                                <div className="flex items-center p-3 border rounded-md">
                                    <Checkbox
                                        id="mka-collection"
                                        checked={selectedCollections.MKA}
                                        onCheckedChange={() =>
                                            toggleCollection('MKA')
                                        }
                                    />
                                    <Label htmlFor="mka-collection" className="ml-2">
                                        MKA Pessbook (Motu Koitabu Assembly)
                                    </Label>
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
                                    onClick={moveToNextStep}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Continue
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.PERSONAL_INFO:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center">
                            <CardTitle>Step 3: Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">3</span>
                                </div>

                                {capturedImage && (
                                    <div className="mb-6">
                                        <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
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
                                                <SelectItem value="Other">Other</SelectItem>
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

                                {/* Residential Address Selection */}
                                <div className="space-y-4">
                                    <Label className="text-base font-medium">Residential Address</Label>

                                    {/* PNG Collection Location */}
                                    {selectedCollections.PNG && (
                                        <div className="space-y-2">
                                            <h4 className="text-sm font-medium">PNG Pess Book Location <span className="text-red-500">*</span></h4>
                                            <FolderSelector
                                                onFolderSelect={(folders) => {
                                                    // Filter to ensure we select at least 2 levels deep (collection/province/district)
                                                    const validFolders = folders.filter(f => f.split('/').length >= 3 && f.startsWith('PNG'));
                                                    if (validFolders.length > 0) {
                                                        setPNGLocation(validFolders[0]);
                                                    }
                                                }}
                                                initialSelected={pngLocation ? [pngLocation] : []}
                                                minLevel={2} // Require at least province and district
                                            />
                                            {pngLocation && pngLocation.split('/').length < 3 && (
                                                <p className="text-sm text-red-500 mt-1">Please select at least down to district level</p>
                                            )}
                                        </div>
                                    )}

                                    {/* ABG Collection Location */}
                                    {selectedCollections.ABG && (
                                        <div className="space-y-2 mt-4">
                                            <h4 className="text-sm font-medium">ABG Location <span className="text-red-500">*</span></h4>
                                            <FolderSelector
                                                onFolderSelect={(folders) => {
                                                    const validFolders = folders.filter(f => f.split('/').length >= 3 && f.startsWith('ABG'));
                                                    if (validFolders.length > 0) {
                                                        setABGLocation(validFolders[0]);
                                                    }
                                                }}
                                                initialSelected={abgLocation ? [abgLocation] : []}
                                                minLevel={2} // Require at least 2 levels deep
                                            />
                                            {abgLocation && abgLocation.split('/').length < 3 && (
                                                <p className="text-sm text-red-500 mt-1">Please select at least down to district level</p>
                                            )}
                                        </div>
                                    )}

                                    {/* MKA Collection Location */}
                                    {selectedCollections.MKA && (
                                        <div className="space-y-2 mt-4">
                                            <h4 className="text-sm font-medium">MKA Location <span className="text-red-500">*</span></h4>
                                            <FolderSelector
                                                onFolderSelect={(folders) => {
                                                    const validFolders = folders.filter(f => f.split('/').length >= 3 && f.startsWith('MKA'));
                                                    if (validFolders.length > 0) {
                                                        setMKALocation(validFolders[0]);
                                                    }
                                                }}
                                                initialSelected={mkaLocation ? [mkaLocation] : []}
                                                minLevel={2} // Require at least 2 levels deep
                                            />
                                            {mkaLocation && mkaLocation.split('/').length < 3 && (
                                                <p className="text-sm text-red-500 mt-1">Please select at least down to village level</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Account Information</Label>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Address <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Email Address"
                                            required
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
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start space-x-2 pt-4">
                                    <Checkbox
                                        id="terms"
                                        checked={agreedToTerms}
                                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                                    />
                                    <Label htmlFor="terms" className="text-sm">
                                        I agree to the <button type="button" onClick={() => setShowAgreementDialog(true)} className="text-indigo-600 hover:underline">terms and conditions</button> and to provide my data and photo at will.
                                    </Label>
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
                                    disabled={isLoading || !agreedToTerms}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Registering...
                                        </>
                                    ) : (
                                        'Register'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.CONFIRM_EMAIL:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center">
                            <CardTitle>Registration Complete</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 text-center">
                            <div className="mx-auto rounded-full bg-green-100 w-20 h-20 flex items-center justify-center mb-4">
                                <CheckCircle className="h-10 w-10 text-green-600" />
                            </div>

                            <h2 className="text-xl font-bold mb-4">Thank You!</h2>
                            <p className="mb-6">
                                Your registration has been successfully completed. A confirmation link has been sent to your email address.
                            </p>

                            <p className="text-sm mb-6">
                                Please check your email and click the confirmation link to activate your account.
                            </p>

                            <div className="flex justify-center space-x-4">
                                <Button
                                    onClick={() => router.push('/login')}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    Go to Login
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
        <>
            <Head>
                <title>Register - PNG Pess Book</title>
                <meta name="description" content="Register to PNG Pess Book" />
            </Head>
            <Layout title="Signup Page" showHistory={false} showNewSearch={false}>
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            {/* Step Indicators */}
                            <div className="hidden md:flex w-full justify-between items-center mb-6">
                                {[1, 2, 3, 4].map((step) => (
                                    <div
                                        key={step}
                                        className={`flex flex-col items-center ${
                                            currentStep >= step - (currentStep >= RegistrationStep.USER_AGREEMENT ? 1 : 0)
                                                ? 'text-indigo-600' : 'text-slate-400'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                            currentStep > step - (currentStep >= RegistrationStep.USER_AGREEMENT ? 1 : 0)
                                                ? 'bg-indigo-600 text-white'
                                                : currentStep === step - (currentStep >= RegistrationStep.USER_AGREEMENT ? 1 : 0)
                                                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {step}
                                        </div>
                                        <span className="text-xs hidden md:block">
                                            {step === 1 && "Live Test"}
                                            {step === 2 && "Membership"}
                                            {step === 3 && "Personal Info"}
                                            {step === 4 && "Confirm"}
                                        </span>
                                    </div>
                                ))}

                                {/* Connecting lines */}
                                <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 -z-10"></div>
                            </div>
                        </div>
                    </div>

                    {renderStepContent()}
                </div>
            </Layout>

            {/* User Agreement Dialog */}
            <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
                <DialogContent className="sm:max-w-md bg-white text-black dark:bg-slate-800 dark:text-white">
                    <DialogHeader>
                        <DialogTitle>PNG Pess Book User Agreement</DialogTitle>
                        <DialogDescription>
                            Please read and agree to the following terms to proceed with registration
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[60vh] mt-4">
                        <div className="p-1">
                            <h3 className="font-semibold mb-2">PNG Pess Book User Agreement</h3>
                            <p className="mb-4 text-sm">
                                By continuing with the registration process, you agree to the following terms:
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Data Collection and Storage</h4>
                            <p className="mb-3 text-sm">
                                You consent to PNG Pess Book collecting, storing, and processing your personal information,
                                including your facial image, name, and residential location data. This information will be
                                stored in the databases you select during registration.
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Data Usage</h4>
                            <p className="mb-3 text-sm">
                                Your information may be used for identity verification purposes within the PNG Pess Book system.
                                Your data may be accessible to authorized administrators of the system.
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Face Recognition</h4>
                            <p className="mb-3 text-sm">
                                You consent to your facial image being used for face recognition purposes within the PNG Pess Book system.
                                This includes matching your face against existing entries in the database for identification purposes.
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Account Management</h4>
                            <p className="mb-3 text-sm">
                                You are responsible for maintaining the confidentiality of your account credentials.
                                You have the right to update your information or request removal of your data by contacting the system administrators.
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Privacy and Security</h4>
                            <p className="mb-3 text-sm">
                                PNG Pess Book implements reasonable security measures to protect your data.
                                However, no system can guarantee absolute security, and you acknowledge this limitation.
                            </p>

                            <h4 className="font-medium mb-1 text-sm">Legal Compliance</h4>
                            <p className="mb-3 text-sm">
                                The collection and processing of your data comply with applicable Papua New Guinea laws and regulations.
                            </p>
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex space-x-2 justify-between mt-4">
                        {currentStep === RegistrationStep.USER_AGREEMENT ? (
                            <>
                                <Button variant="ghost" className="border border-gray" onClick={() => router.push('/')}>Cancel</Button>
                                <Button onClick={handleAgreeToTerms}>I Agree</Button>
                            </>
                        ) : (
                            <>
                                <Button variant="outline" onClick={() => setShowAgreementDialog(false)}>Close</Button>
                                {!agreedToTerms && (
                                    <Button onClick={() => {
                                        setAgreedToTerms(true);
                                        setShowAgreementDialog(false);
                                    }}>I Agree</Button>
                                )}
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}