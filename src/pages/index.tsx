import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('match-me');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [registerName, setRegisterName] = useState<string>('');
  const [registrationComplete, setRegistrationComplete] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Reset state when tab changes
  useEffect(() => {
    setCapturedImage(null);
    setRegisterName('');
    setRegistrationComplete(false);
  }, [activeTab]);

  // Handle image capture for Match Me mode
  const handleMatchCapture = (imageSrc: string) => {
    if (imageSrc) {
      // Store the captured image in localStorage
      localStorage.setItem('faceRecog_searchImage', imageSrc);

      // Navigate to search page
      try {
        router.push('/search');
      } catch (error: any) {
        toast.error('Failed to navigate to search page. Please try again.', {
          description: `${error.message}`
        });
        window.location.href = '/search';
      }
    }
  };

  // Handle image capture for Register Me mode
  const handleRegisterCapture = (imageSrc: string) => {
    setCapturedImage(imageSrc);
  };

  // Handle registration submission
  const handleRegistration = async () => {
    if (!capturedImage) {
      toast.error('Please capture an image first');
      return;
    }

    if (!registerName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setIsProcessing(true);

    try {
      // Add user's face to our default PNG collection
      const collectionId = 'PNG'; // Default collection

      // Create a sanitized user ID from name
      const userId = registerName
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Date.now();

      // Call the API to index the face
      const response = await fetch(`/api/collections/${collectionId}/faces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: capturedImage,
          externalImageId: userId,
          additionalInfo: {
            name: registerName,
            registrationDate: new Date().toISOString()
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to register');
      }

      // Registration successful
      setRegistrationComplete(true);
      toast.success('Registration successful!');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset registration form
  const handleResetRegistration = () => {
    setCapturedImage(null);
    setRegisterName('');
    setRegistrationComplete(false);
  };

  return (
      <>
        <Head>
          <title>Face Recognition</title>
          <meta name="description" content="AWS Rekognition Face Recognition App" />
        </Head>
        <Layout>
          <div className="flex flex-col items-center justify-center max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-center mb-6">Face Recognition</h1>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-3xl">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="match-me" className="text-base py-3">Match Me</TabsTrigger>
                <TabsTrigger value="register-me" className="text-base py-3">Register Me</TabsTrigger>
              </TabsList>

              {/* Match Me Tab */}
              <TabsContent value="match-me">
                <Card className="border-slate-200 dark:border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-center">Match My Face</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                      Take a photo of yourself or upload an image to find matches
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="flex-1">
                        <CameraCapture
                            onCapture={handleMatchCapture}
                            mode="match"
                        />
                      </div>

                      <div className="flex flex-col justify-center space-y-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                          <h3 className="font-semibold text-lg mb-3">How it works</h3>
                          <ul className="space-y-2">
                            <li className="flex items-start">
                              <span className="flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 h-6 w-6 text-indigo-600 dark:text-indigo-400 text-sm font-medium mr-2">1</span>
                              <span>Position your face in the circle</span>
                            </li>
                            <li className="flex items-start">
                              <span className="flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 h-6 w-6 text-indigo-600 dark:text-indigo-400 text-sm font-medium mr-2">2</span>
                              <span>Wait for face detection (green indicator)</span>
                            </li>
                            <li className="flex items-start">
                              <span className="flex-shrink-0 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/30 h-6 w-6 text-indigo-600 dark:text-indigo-400 text-sm font-medium mr-2">3</span>
                              <span>Click &#34;Match Now&#34; to find matches</span>
                            </li>
                          </ul>
                        </div>

                        <div className="text-center text-sm text-slate-500 dark:text-slate-400">
                          <p>We&#39;ll search our database to find matching faces</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Register Me Tab */}
              <TabsContent value="register-me">
                {registrationComplete ? (
                    <Card className="border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-center text-green-600 dark:text-green-400">Registration Complete!</CardTitle>
                      </CardHeader>
                      <CardContent className="text-center">
                        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Thank You, {registerName}!</h3>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                          Your face has been successfully registered in our system.
                        </p>
                        <Button
                            onClick={handleResetRegistration}
                            className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 mx-auto"
                        >
                          Register Another Face
                        </Button>
                      </CardContent>
                    </Card>
                ) : (
                    <Card className="border-slate-200 dark:border-slate-700">
                      <CardHeader>
                        <CardTitle className="text-center">Register Your Face</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
                          Take a selfie and provide your name to register in our system
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="flex-1">
                            {capturedImage ? (
                                <div className="space-y-4">
                                  <div className="border rounded-md overflow-hidden aspect-square relative">
                                    <img
                                        src={capturedImage}
                                        alt="Captured"
                                        className="w-full h-full object-cover"
                                    />
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="absolute top-2 right-2 bg-white/80 text-slate-700"
                                        onClick={() => setCapturedImage(null)}
                                    >
                                      Retake
                                    </Button>
                                  </div>
                                </div>
                            ) : (
                                <CameraCapture
                                    onCapture={handleRegisterCapture}
                                    mode="register"
                                />
                            )}
                          </div>

                          <div className="flex flex-col justify-center space-y-4">
                            <div className="space-y-2">
                              <label htmlFor="register-name" className="text-sm font-medium">Your Name</label>
                              <Input
                                  id="register-name"
                                  value={registerName}
                                  onChange={(e) => setRegisterName(e.target.value)}
                                  placeholder="Enter your full name"
                                  disabled={isProcessing}
                              />
                            </div>

                            <Button
                                onClick={handleRegistration}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                disabled={!capturedImage || !registerName.trim() || isProcessing}
                            >
                              {isProcessing ? (
                                  <div className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Processing...
                                  </div>
                              ) : "Complete Registration"}
                            </Button>

                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                              By registering, you agree to our face recognition demo.
                              Your data will be stored for demonstration purposes only.
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </Layout>
      </>
  );
}