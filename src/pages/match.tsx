"use client";

import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RefreshCw, CheckCircle, Camera } from 'lucide-react';
import FolderSelector from '@/components/capture/FolderSelector';

export default function MatchPage() {
    const router = useRouter();
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [isFaceDetected, setIsFaceDetected] = useState(false);
    const [step, setStep] = useState<'capture' | 'select-collection' | 'confirm'>('capture');

    // Collection selection state
    const [selectedCollections, setSelectedCollections] = useState<{[key: string]: boolean}>({
        PNG: true, // PNG Pessbook is selected by default
        ABG: false,
        MKA: false
    });

    // Location filters for specific area search
    const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
    const [showLocationSelector, setShowLocationSelector] = useState(false);

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
                setIsFaceDetected(true);
                toast.success('Face detected! Click Continue when ready.');
                // Don't automatically proceed to the next step
                // Let the user decide when to move forward
            } else {
                toast.error('No face detected in the image. Please try again.');
                setIsFaceDetected(false);
            }
        } catch (error) {
            console.error('Face detection error:', error);
            toast.error('Error detecting face');
        }
    };

    // Toggle collection selection
    const toggleCollection = (collection: string) => {
        setSelectedCollections(prev => ({
            ...prev,
            [collection]: !prev[collection]
        }));
    };

    // Handle back button
    const handleBack = () => {
        if (step === 'select-collection') {
            setStep('capture');
        } else if (step === 'confirm') {
            setStep('select-collection');
        }
    };

    // Handle search confirmation
    const handleConfirm = () => {
        setStep('confirm');
    };

    // Get selected collection IDs
    const getSelectedCollections = (): string[] => {
        return Object.entries(selectedCollections)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .filter(([_, isSelected]) => isSelected)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(([collection, _]) => collection);
    };

    // Handle folder selection for filtering
    const handleFolderSelect = (folders: string[]) => {
        setSelectedLocations(folders);
    };

    // Perform the search
    const handleSearch = async () => {
        if (!capturedImage) {
            toast.error('No image captured. Please try again.');
            return;
        }

        const collections = getSelectedCollections();

        if (collections.length === 0) {
            toast.error('Please select at least one collection');
            return;
        }

        setIsSearching(true);

        try {
            // Store search data in localStorage
            localStorage.setItem('faceRecog_searchImage', capturedImage);
            localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(collections));

            // Include location filters if selected
            if (selectedLocations.length > 0) {
                localStorage.setItem('faceRecog_locationFilters', JSON.stringify(selectedLocations));
            } else {
                localStorage.removeItem('faceRecog_locationFilters');
            }

            // Navigate to search page which will process the search
            router.push('/search');
        } catch (error) {
            console.error('Error preparing search:', error);
            toast.error('An error occurred');
            setIsSearching(false);
        }
    };

    // Retake photo
    const retakePhoto = () => {
        setCapturedImage(null);
        setIsFaceDetected(false);
    };

    // Render content based on current step
    const renderContent = () => {
        switch (step) {
            case 'capture':
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Take a Photo</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                <p className="mb-4">
                                    Take a clear photo of yourself for matching against our database.
                                </p>

                                {capturedImage && (
                                    <div className="mb-6">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>

                                        <div className="flex justify-center space-x-2 mt-4">
                                            <Button
                                                variant="outline"
                                                onClick={retakePhoto}
                                                className="flex items-center"
                                            >
                                                <Camera size={16} className="mr-2" />
                                                Retake Photo
                                            </Button>

                                            {isFaceDetected && (
                                                <Button
                                                    onClick={() => setStep('select-collection')}
                                                    className="bg-indigo-600 hover:bg-indigo-700 flex items-center"
                                                >
                                                    <CheckCircle size={16} className="mr-2" />
                                                    Continue
                                                </Button>
                                            )}
                                        </div>

                                        {isFaceDetected && (
                                            <div className="mt-2 flex items-center justify-center text-sm text-green-600">
                                                <CheckCircle size={16} className="mr-1" />
                                                Face detected successfully!
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {!capturedImage && <CameraCapture onCapture={handleCapture} />}
                        </CardContent>
                    </Card>
                );

            case 'select-collection':
                return (
                    <Card className="border-none shadow-lg">
                        <CardHeader className="text-center bg-slate-50">
                            <CardTitle>Select Collections to Search</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="text-center mb-6">
                                {capturedImage && (
                                    <div className="mb-6">
                                        <div className="w-32 h-32 mx-auto rounded-full overflow-hidden border-4 border-indigo-100">
                                            <img
                                                src={capturedImage}
                                                alt="Captured face"
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        {isFaceDetected && (
                                            <div className="mt-2 flex items-center justify-center text-sm text-green-600">
                                                <CheckCircle size={16} className="mr-1" />
                                                Face detected successfully!
                                            </div>
                                        )}
                                    </div>
                                )}

                                <p className="mb-4">Select which collections you want to search in:</p>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="flex items-center p-3 border rounded-md bg-amber-50">
                                    <Checkbox
                                        id="png-collection"
                                        checked={selectedCollections.PNG}
                                        onCheckedChange={() => toggleCollection('PNG')}
                                    />
                                    <Label htmlFor="png-collection" className="ml-2 font-medium">
                                        PNG Pessbook
                                    </Label>
                                </div>

                                <div className="flex items-center p-3 border rounded-md">
                                    <Checkbox
                                        id="abg-collection"
                                        checked={selectedCollections.ABG}
                                        onCheckedChange={() => toggleCollection('ABG')}
                                    />
                                    <Label htmlFor="abg-collection" className="ml-2">
                                        ABG Pessbook (Autonomous Region of Bougainville)
                                    </Label>
                                </div>

                                <div className="flex items-center p-3 border rounded-md">
                                    <Checkbox
                                        id="mka-collection"
                                        checked={selectedCollections.MKA}
                                        onCheckedChange={() => toggleCollection('MKA')}
                                    />
                                    <Label htmlFor="mka-collection" className="ml-2">
                                        MKA Pessbook (Motu Koitabu Assembly)
                                    </Label>
                                </div>
                            </div>

                            <div className="mt-6 mb-6">
                                <Button
                                    variant={showLocationSelector ? "secondary" : "outline"}
                                    onClick={() => setShowLocationSelector(!showLocationSelector)}
                                    className="w-full"
                                >
                                    {showLocationSelector ? "Hide Location Filters" : "Add Location Filters (Optional)"}
                                </Button>

                                {showLocationSelector && (
                                    <div className="mt-4">
                                        <FolderSelector
                                            onFolderSelect={handleFolderSelect}
                                            initialSelected={selectedLocations}
                                            minLevel={0} // Allow any level for filtering
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>

                                <Button
                                    onClick={handleConfirm}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={getSelectedCollections().length === 0}
                                >
                                    Continue
                                </Button>
                            </div>
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
                                    We&#39;ll search for matches in the following collections:
                                </p>

                                <div className="bg-slate-50 p-3 rounded-md inline-block">
                                    <ul className="text-left">
                                        {getSelectedCollections().map(collection => (
                                            <li key={collection} className="flex items-center mb-1">
                                                <CheckCircle size={16} className="mr-2 text-green-600" />
                                                {collection} Pessbook
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                {selectedLocations.length > 0 && (
                                    <div className="mt-4">
                                        <p className="mb-2">Filtered by locations:</p>
                                        <div className="bg-slate-50 p-3 rounded-md inline-block max-w-full">
                                            <div className="text-left max-h-24 overflow-y-auto">
                                                {selectedLocations.map(location => (
                                                    <div key={location} className="text-xs mb-1 truncate">
                                                        {location}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between mt-6">
                                <Button
                                    variant="outline"
                                    onClick={handleBack}
                                >
                                    Back
                                </Button>

                                <Button
                                    onClick={handleSearch}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                    disabled={isSearching}
                                >
                                    {isSearching ? (
                                        <>
                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                            Searching...
                                        </>
                                    ) : (
                                        'Search Now'
                                    )}
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
                            {[1, 2, 3, 4].map((stepNum) => {
                                // Determine if step is active or completed
                                let isActive = false;
                                let isCompleted = false;

                                if (step === 'capture' && stepNum === 1) isActive = true;
                                if (step === 'select-collection' && stepNum === 2) isActive = true;
                                if (step === 'confirm' && stepNum === 3) isActive = true;

                                if ((step === 'select-collection' || step === 'confirm') && stepNum === 1) isCompleted = true;
                                if (step === 'confirm' && stepNum === 2) isCompleted = true;

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
                                            {stepNum === 2 && "Select Dataset"}
                                            {stepNum === 3 && "Confirm"}
                                            {stepNum === 4 && "View Results"}
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