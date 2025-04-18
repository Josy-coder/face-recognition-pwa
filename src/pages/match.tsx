"use client";

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import SimpleCameraCapture from '@/components/capture/SimpleCameraCapture';
import { Camera, Upload } from 'lucide-react';

export default function MatchPage() {
    const router = useRouter();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [step, setStep] = useState<'capture' | 'confirm'>('capture');
    const [uploadMode, setUploadMode] = useState<boolean>(false);

    // Handle image capture
    const handleCapture = async (imageSrc: string) => {
        setCapturedImage(imageSrc);

        // Check if face is detected in the image
        try {
            const response = await fetch('/api/face-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            const data = await response.json();

            if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
                // Face detected, proceed to confirm step
                setStep('confirm');
                // Don't show a success toast to keep the process simple
            } else {
                toast.error('No face detected in the image. Please try again.');
                setCapturedImage(null);
            }
        } catch (error) {
            console.error('Face detection error:', error);
            toast.error('Error detecting face. Please try again.');
            setCapturedImage(null);
        }
    };

    // Handle image upload
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        // Check if file is an image
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            if (e.target?.result) {
                const imageSrc = e.target.result as string;

                // First set the image to show loading state
                setCapturedImage(imageSrc);

                // Then check if face is detected in the image
                try {
                    const response = await fetch('/api/face-detection', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ image: imageSrc }),
                    });

                    const data = await response.json();

                    if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
                        // Face detected, proceed to confirm step
                        setStep('confirm');
                    } else {
                        toast.error('No face detected in the uploaded image. Please try a different photo.');
                        setCapturedImage(null);
                    }
                } catch (error) {
                    console.error('Face detection error:', error);
                    toast.error('Error detecting face in the uploaded image');
                    setCapturedImage(null);
                }
            }
        };
        reader.readAsDataURL(file);
    };

    // Handle search
    const handleSearch = () => {
        if (!capturedImage) {
            toast.error('No image captured. Please try again.');
            return;
        }

        setIsSearching(true);

        try {
            // Store search data in localStorage
            localStorage.setItem('faceRecog_searchImage', capturedImage);
            localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(['PNG']));

            // Navigate to search page which will process the search
            router.push('/search');
        } catch (error) {
            console.error('Error preparing search:', error);
            toast.error('An error occurred');
            setIsSearching(false);
        }
    };

    // Cancel and go back
    const handleCancel = () => {
        if (step === 'confirm') {
            // Go back to capture step
            setStep('capture');
            setCapturedImage(null);
        }
    };

// Render content based on current step
    const renderContent = () => {
        switch (step) {
            case 'capture':
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Match my face or a photo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <p className="mb-4">
                                    Take a clear photo or upload an image for matching against our database.
                                </p>

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
                        </CardContent>
                    </Card>
                );

            case 'confirm':
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Confirm Face Match</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <div className="mb-6 flex justify-center">
                                    <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100">
                                        {capturedImage && (
                                            <img
                                                src={capturedImage}
                                                alt="Face to match"
                                                className="w-full h-full object-cover"
                                            />
                                        )}
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold mb-2">Ready to Search</h3>
                                <p className="mb-4">
                                    We&#39;ll search for matches in the PNG Pessbook database.
                                </p>
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button
                                    variant="outline"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </Button>

                                <Button
                                    onClick={handleSearch}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isSearching}
                                >
                                    {isSearching ? "Searching..." : "Match"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
        }
    };

    return (
        <>
            <Head>
                <title>Face Match - PNG Pess Book</title>
                <meta name="description" content="Match a face in the PNG Pess Book system" />
            </Head>
            <Layout title="Face Matching" showHistory={false} showNewSearch={false}>
                <div className="max-w-2xl mx-auto">
                    {/* Step indicators */}
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex w-full justify-between items-center relative">
                            {[1, 2, 3].map((stepNum) => {
                                // Determine if step is active or completed
                                let isActive = false;
                                let isCompleted = false;

                                if (step === 'capture' && stepNum === 1) isActive = true;
                                if (step === 'confirm' && stepNum === 2) isActive = true;
                                if (step === 'confirm' && stepNum === 1) isCompleted = true;

                                return (
                                    <div
                                        key={stepNum}
                                        className={`flex flex-col items-center ${isActive || isCompleted ? 'text-indigo-600' : 'text-slate-400'}`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                                            isCompleted
                                                ? 'bg-indigo-600 text-white'
                                                : isActive
                                                    ? 'bg-indigo-100 text-indigo-600 border-2 border-indigo-600'
                                                    : 'bg-slate-100 text-slate-400'
                                        }`}>
                                            {stepNum}
                                        </div>
                                        <span className="text-xs block whitespace-nowrap">
                                            {stepNum === 1 && "Take Photo"}
                                            {stepNum === 2 && "Confirm"}
                                            {stepNum === 3 && "View Results"}
                                        </span>
                                    </div>
                                );
                            })}

                            {/* Connecting lines */}
                            <div className="absolute left-0 right-0 top-5 h-0.5 bg-slate-200 -z-10"></div>
                        </div>
                    </div>

                    {renderContent()}
                </div>
            </Layout>
        </>
    );
}