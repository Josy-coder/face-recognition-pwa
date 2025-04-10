import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import ImageCropper from '@/components/capture/ImageCropper';
import FolderSelector from '@/components/capture/FolderSelector';

export default function HomePage() {
  const router = useRouter();
  const [step, setStep] = useState<'capture' | 'crop' | 'folder' | 'register'>('capture');
  const [mode, setMode] = useState<'match' | 'register'>('match');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [totalImages, setTotalImages] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationComplete, setRegistrationComplete] = useState(false);

  // Fetch total images in PNG collection when component mounts
  useEffect(() => {
    const fetchCollectionInfo = async () => {
      try {
        const response = await fetch('/api/collections/info?collectionId=PNG');
        if (response.ok) {
          const data = await response.json();
          setTotalImages(data.faceCount || 0);
        }
      } catch (error) {
        console.error('Error fetching collection info:', error);
      }
    };

    fetchCollectionInfo();
  }, []);

  // Handle image capture - now with mode parameter
  const handleCapture = (imageSrc: string, captureMode: 'match' | 'register') => {
    setCapturedImage(imageSrc);
    setMode(captureMode);

    // Move to the crop step
    setStep('crop');
  };

  // Handle image cropping
  const handleCrop = (croppedImageSrc: string) => {
    setCroppedImage(croppedImageSrc);

    if (mode === 'match') {
      // In match mode, proceed to folder selection
      setStep('folder');
    } else {
      // In register mode, go to registration form
      setStep('register');
    }
  };

  // Cancel cropping and go back to capture
  const handleCropCancel = () => {
    setCapturedImage(null);
    setStep('capture');
  };

  // Handle folder selection and proceed to search
  const handleFolderSelect = (folderPaths: string[]) => {
    setSelectedFolders(folderPaths);

    // Use PNG by default if no folders selected
    const selectedPaths = folderPaths.length > 0 ? folderPaths : ['PNG'];

    // Store the selected data in localStorage
    localStorage.setItem('faceRecog_searchImage', croppedImage!);
    localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(selectedPaths));

    // Navigate to search page
    router.push('/search');
  };

  // Back function for folder selection
  const handleFolderBack = () => {
    setStep('crop');
  };

  // Handle registration form submission
  const handleRegister = async () => {
    if (!name.trim()) {
      toast.error('Please enter your name');
      return;
    }

    if (!croppedImage) {
      toast.error('No image available. Please try again.');
      return;
    }

    setIsRegistering(true);

    try {
      // Create a JSON object with the person's information
      const personInfo = {
        name: name,
        contactInfo: contactInfo || 'Not provided',
        registeredAt: new Date().toISOString()
      };

      // Add the face to the PNG collection
      const response = await fetch('/api/collections/PNG/faces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: croppedImage,
          externalImageId: name.replace(/\s+/g, '-'), // Use name as the ID
          additionalInfo: personInfo
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Registration failed');
      }

      // Registration successful
      setRegistrationComplete(true);
      toast.success('Registration completed successfully!');

    } catch (error) {
      console.error('Registration error:', error);
      toast.error(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRegistering(false);
    }
  };

  // Back function for registration
  const handleRegisterBack = () => {
    setStep('crop');
  };

  // Reset after successful registration
  const handleDone = () => {
    setCapturedImage(null);
    setCroppedImage(null);
    setName('');
    setContactInfo('');
    setRegistrationComplete(false);
    setStep('capture');
  };

  // Render based on current step
  const renderStep = () => {
    switch (step) {
      case 'capture':
        return (
            <div className="max-w-2xl mx-auto">
              {totalImages !== null && (
                  <div className="mb-4 text-center">
                    <Badge className="mx-auto flex items-center gap-1 justify-center">
                      <Users size={14} />
                      <span>{totalImages} faces in database</span>
                    </Badge>
                  </div>
              )}
              <CameraCapture onCapture={handleCapture} />
            </div>
        );

      case 'crop':
        return capturedImage ? (
            <ImageCropper
                imageSrc={capturedImage}
                onCrop={handleCrop}
                onCancel={handleCropCancel}
                autoCrop={true}
            />
        ) : (
            <div className="text-center">
              <p>No image captured. Please go back and try again.</p>
              <Button onClick={() => setStep('capture')} className="mt-4">
                Back
              </Button>
            </div>
        );

      case 'folder':
        return (
            <div className="max-w-md mx-auto space-y-6">
              <Card className="border-slate-200 dark:border-slate-700">
                <CardHeader>
                  <CardTitle className="text-center">Select Collections</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Choose which collections to search in or leave default (PNG)
                    </p>

                    {croppedImage && (
                        <div className="text-center mb-6">
                          <div className="w-32 h-32 mx-auto relative">
                            <div className="absolute inset-0 rounded-full shadow-inner" aria-hidden="true"></div>
                            <div className="absolute inset-0 rounded-full overflow-hidden">
                              <img
                                  src={croppedImage}
                                  alt="Your face"
                                  className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                    )}
                  </div>

                  <FolderSelector onFolderSelect={setSelectedFolders} />

                  <div className="mt-6 flex justify-between">
                    <Button variant="ghost" onClick={handleFolderBack}>
                      Back
                    </Button>
                    <Button
                        onClick={() => handleFolderSelect(selectedFolders)}
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                    >
                      Search
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
        );

      case 'register':
        if (registrationComplete) {
          return (
              <Card className="max-w-md mx-auto border-slate-200 dark:border-slate-700">
                <CardContent className="pt-6 pb-4 text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl mb-4">Thank You For Participating!</CardTitle>
                  <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Your registration has been successfully completed.
                  </p>
                  <div className="mb-6">
                    {croppedImage && (
                        <div className="w-32 h-32 mx-auto overflow-hidden rounded-full border-4 border-green-100 dark:border-green-900">
                          <img
                              src={croppedImage}
                              alt="Registered face"
                              className="w-full h-full object-cover"
                          />
                        </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="pb-6 justify-center">
                  <Button onClick={handleDone} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    Done
                  </Button>
                </CardFooter>
              </Card>
          );
        }

        return (
            <Card className="max-w-md mx-auto border-slate-200 dark:border-slate-700">
              <CardHeader>
                <CardTitle className="text-center">Complete Registration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Preview of captured image */}
                  {croppedImage && (
                      <div className="text-center mb-6">
                        <div className="w-32 h-32 mx-auto overflow-hidden rounded-full border-4 border-indigo-100 dark:border-indigo-900">
                          <img
                              src={croppedImage}
                              alt="Your face"
                              className="w-full h-full object-cover"
                          />
                        </div>
                      </div>
                  )}

                  {/* Name input */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Your Name <span className="text-red-500">*</span></Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter your full name"
                        required
                        disabled={isRegistering}
                    />
                  </div>

                  {/* Optional contact info */}
                  <div className="space-y-2">
                    <Label htmlFor="contactInfo">Contact Info (Optional)</Label>
                    <Input
                        id="contactInfo"
                        value={contactInfo}
                        onChange={(e) => setContactInfo(e.target.value)}
                        placeholder="Email or phone number"
                        disabled={isRegistering}
                    />
                    <p className="text-xs text-slate-500">This information will be stored with your face data</p>
                  </div>

                  {/* Form buttons */}
                  <div className="flex justify-between pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRegisterBack}
                        disabled={isRegistering}
                    >
                      Back
                    </Button>
                    <Button
                        type="button"
                        className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                        disabled={isRegistering || !name.trim()}
                        onClick={handleRegister}
                    >
                      {isRegistering ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Registering...
                          </>
                      ) : (
                          'Complete Registration'
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
        );

      default:
        return <div>Something went wrong</div>;
    }
  };

  return (
      <>
        <Head>
          <title>Face Recognition</title>
          <meta name="description" content="Face recognition application" />
        </Head>
        <Layout title="Face Recognition" showHistory={true}>
          {renderStep()}
        </Layout>
      </>
  );
}