import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import SimpleCameraCapture from '@/components/capture/SimpleCameraCapture';
import FolderSelector from '@/components/capture/FolderSelector';
import { RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Registration steps - Now with combined face detection (removing separate liveness step)
enum RegistrationStep {
    TAKE_SELFIE = 0,
    PERSONAL_INFO = 1,
    EMAIL_CONFIRMATION = 2
}

export default function AccountRegistrationPage() {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState<RegistrationStep>(RegistrationStep.TAKE_SELFIE);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAgreementDialog, setShowAgreementDialog] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [faceId] = useState<string | null>(null);
    const [faceVerified, setFaceVerified] = useState(false);

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
    const [residentialPath, setResidentialPath] = useState('');

    // Handle selfie capture with simple face detection
    const handleSelfieCapture = async (imageSrc: string) => {
        setCapturedImage(imageSrc);
        setIsLoading(true);

        try {
            // Check if face is detected - that's all we need
            const response = await fetch('/api/face-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            const data = await response.json();

            if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
                // Face detected - that's all we need to validate
                setFaceVerified(true);
                toast.success('Face verified successfully!');

                // Move directly to personal info step
                setCurrentStep(RegistrationStep.PERSONAL_INFO);
            } else {
                // No face detected
                toast.error('No face detected. Please try again with a clearer photo.');
            }
        } catch (error) {
            console.error('Face detection error:', error);
            toast.error('Error processing image. Please try again.');
        } finally {
            setIsLoading(false);
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

    // Handle registration submission
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

        setIsLoading(true);

        try {
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
                    residentialPath,
                    image: capturedImage,
                    faceVerified  // Add this flag so backend knows face was verified
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
            case RegistrationStep.TAKE_SELFIE:
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Take a Selfie</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <Alert className="mb-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                                <AlertTriangle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <AlertDescription className="text-sm text-blue-600 dark:text-blue-400">
                                    This session is being used to verify your identity. Please ensure you are in a well-lit area for your movements to be visible.
                                </AlertDescription>
                            </Alert>

                            <SimpleCameraCapture onCapture={handleSelfieCapture} isLoading={isLoading} />

                            <div className="mt-4 text-sm text-slate-500">
                                <ul className="list-disc pl-5 space-y-1">
                                    <li>Look directly at the camera</li>
                                    <li>Ensure good lighting on your face</li>
                                    <li>Remove sunglasses or hats</li>
                                    <li>Keep a neutral expression</li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                );

            case RegistrationStep.PERSONAL_INFO:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Enter Your Information</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="mb-6 flex justify-center">
                                {capturedImage && (
                                    <div className="mb-4">
                                        <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Your photo"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {faceVerified && (
                                            <div className="mt-1 flex items-center justify-center gap-1 text-xs text-green-600">
                                                <CheckCircle className="h-3 w-3" />
                                                <span>Verified</span>
                                            </div>
                                        )}
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
                                            onSelect={(path) => {
                                                if (path) {
                                                    setResidentialPath(path);
                                                }
                                            }}
                                        />

                                        {residentialPath && residentialPath.split('/').length < 3 && (
                                            <p className="text-xs text-slate-500">
                                                Please select the person&#39;s location down to at least the district level.
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Account information */}
                                <div className="mt-4">
                                    <h3 className="font-medium">Account Information</h3>
                                    <div className="grid grid-cols-1 gap-4 mt-2">
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
                                            <p className="text-xs text-slate-500">
                                                You&#39;ll need to confirm your email address to complete registration.
                                            </p>
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
                                </div>

                                {/* Terms and conditions */}
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

            case RegistrationStep.EMAIL_CONFIRMATION:
                return (
                    <Card className="border-none shadow-lg overflow-hidden">
                        <CardHeader className="text-center bg-slate-50">
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
                return null;
        }
    };

    return (
        <>
            <Head>
                <title>Register Account - PNG Pess Book</title>
                <meta name="description" content="Register for a PNG Pess Book Account" />
            </Head>
            <Layout title="Create a PNG Pess Book Account" showHistory={false} showNewSearch={false}>
                <div className="max-w-3xl mx-auto">
                    {/* Steps indicator - now with 3 steps instead of 4 */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center relative">
                            {[1, 2, 3].map((step) => {
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
                                            {step === 1 && "Take Selfie"}
                                            {step === 2 && "Your Information"}
                                            {step === 3 && "Confirmation"}
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

            {/* User Agreement Dialog */}
            <Dialog open={showAgreementDialog} onOpenChange={setShowAgreementDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>PNG Pess Book User Agreement</DialogTitle>
                        <DialogDescription>
                            Please read and agree to the following terms
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
                                including your facial image, name, and residential location data.
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
                        </div>
                    </ScrollArea>

                    <DialogFooter className="flex space-x-2 justify-between mt-4">
                        <Button variant="ghost" className="border-gray" onClick={() => setShowAgreementDialog(false)}>Cancel</Button>
                        <Button
                            onClick={() => {
                                setAgreedToTerms(true);
                                setShowAgreementDialog(false);
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700"
                        >
                            I Agree
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}