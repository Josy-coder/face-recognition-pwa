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

// Registration steps based on the screenshots
enum RegistrationStep {
    LIVE_TEST = 1,
    FACE_CAPTURE = 2,
    SELECT_MEMBERSHIP = 3,
    PERSONAL_INFO = 4,
    CONFIRM_EMAIL = 5
}

export default function UserRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<RegistrationStep>(RegistrationStep.LIVE_TEST);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [faceId, setFaceId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [, setExistingFaceData] = useState<any>(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

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

    // Location hierarchy selections
    const [province, setProvince] = useState('');
    const [district, setDistrict] = useState('');
    const [llg] = useState('');
    const [ward] = useState('');
    const [village] = useState('');

    // Available provinces and districts (would come from API)
    const [availableProvinces, setAvailableProvinces] = useState<{value: string, label: string}[]>([]);
    const [availableDistricts, setAvailableDistricts] = useState<{value: string, label: string}[]>([]);

    // Terms agreement
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    // Load location data when component mounts
    useEffect(() => {
        fetchProvinces();
    }, []);

    // Fetch provinces from API
    const fetchProvinces = async () => {
        try {
            const response = await fetch('/api/locations/PNG/provinces');
            if (response.ok) {
                const data = await response.json();
                setAvailableProvinces(data.provinces || []);
            }
        } catch (error) {
            console.error('Error fetching provinces:', error);
        }
    };

    // Fetch districts when province changes
    useEffect(() => {
        if (province) {
            fetchDistricts(province);
        } else {
            setAvailableDistricts([]);
        }
    }, [province]);

    // Fetch districts from API
    const fetchDistricts = async (provinceValue: string) => {
        try {
            const response = await fetch(`/api/locations/PNG/districts?prefix=${encodeURIComponent(provinceValue)}`);
            if (response.ok) {
                const data = await response.json();
                setAvailableDistricts(data.districts || []);
            }
        } catch (error) {
            console.error('Error fetching districts:', error);
        }
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

                // Now check if face exists in the system
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
                moveToNextStep();
            } else {
                // No face match found, proceed with new registration
                moveToNextStep();
            }
        } catch (error) {
            console.error('Error checking face:', error);
            toast.error('Error checking face in the system');
            moveToNextStep(); // Proceed anyway
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

    // Build the full residential path
    const buildResidentialPath = (): string => {
        const parts = [];

        // Add the active collection (PNG, ABG, MKA)
        let collection = 'PNG'; // Default
        Object.entries(selectedCollections).forEach(([coll, isSelected]) => {
            if (isSelected) {
                collection = coll;
            }
        });
        parts.push(collection);

        // Add location hierarchy
        if (province) parts.push(province);
        if (district) parts.push(district);
        if (llg) parts.push(llg);
        if (ward) parts.push(ward);
        if (village) parts.push(village);

        return parts.join('/');
    };

    // Render step content based on current step
    const renderStepContent = () => {
        switch (currentStep) {
            case RegistrationStep.LIVE_TEST:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Step 1: Live Person Test</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">1</span>
                                </div>
                                <p className="mb-4">Let&#39;s make sure you&#39;re a real person by taking a live photo test.</p>
                            </div>

                            <CameraCapture onCapture={handleCapture} />
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.FACE_CAPTURE:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Step 2: Face Capture</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">2</span>
                                </div>

                                {capturedImage && (
                                    <div className="mb-6">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <p className="mt-2 text-sm text-green-600">
                                            {faceDetected ? 'Face detected successfully!' : 'Face not detected. Please try again.'}
                                        </p>
                                    </div>
                                )}

                                <p className="mb-4">Please take a clear photo of your face for registration.</p>
                            </div>

                            <CameraCapture onCapture={handleCapture} />

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
                                    disabled={!faceDetected || isLoading}
                                >
                                    {isLoading ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Continue'
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.SELECT_MEMBERSHIP:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Step 3: Select Membership Datasets</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">3</span>
                                </div>
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
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Step 4: Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mx-auto rounded-full bg-amber-100 w-20 h-20 flex items-center justify-center mb-4">
                                    <span className="text-2xl font-bold text-amber-600">4</span>
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

                                <div className="space-y-2">
                                    <Label className="text-base font-medium">Residential Address</Label>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="province">Province <span className="text-red-500">*</span></Label>
                                            <Select value={province} onValueChange={setProvince}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select Province" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableProvinces.map(p => (
                                                        <SelectItem key={p.value} value={p.value}>
                                                            {p.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="district">District <span className="text-red-500">*</span></Label>
                                            <Select
                                                value={district}
                                                onValueChange={setDistrict}
                                                disabled={!province}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder={province ? "Select District" : "Select Province First"} />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableDistricts.map(d => (
                                                        <SelectItem key={d.value} value={d.value}>
                                                            {d.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
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
                                        I agree to the <a href="#" className="text-indigo-600 hover:underline">terms and conditions</a> and to provide my data and photo at will.
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
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Step 5: Registration Complete</CardTitle>
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
            <Layout title="Anonymous User Signup Page" showHistory={false} showNewSearch={false}>
                <div className="max-w-3xl mx-auto">
                    <div className="mb-8">
                        <div className="flex justify-between items-center">
                            {/* Step Indicators */}
                            <div className="hidden md:flex w-full justify-between items-center mb-6">
                                {[1, 2, 3, 4, 5].map((step) => (
                                    <div
                                        key={step}
                                        className={`flex flex-col items-center ${currentStep >= step ? 'text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                            currentStep > step
                                                ? 'bg-indigo-600 text-white'
                                                : currentStep === step
                                                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {step}
                                        </div>
                                        <span className="text-xs hidden md:block">
                                            {step === 1 && "Live Test"}
                                            {step === 2 && "Face Picture"}
                                            {step === 3 && "Membership"}
                                            {step === 4 && "Personal Info"}
                                            {step === 5 && "Confirm"}
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
        </>
    );
}