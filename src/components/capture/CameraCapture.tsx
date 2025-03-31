import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import { Camera, Upload, AlertCircle } from 'lucide-react';
import LivenessDetection from './LivenessDetection';

interface CameraCaptureProps {
    onCapture: (imageSrc: string) => void;
    mode?: 'match' | 'register';
    autoCapture?: boolean;
}

export default function CameraCapture({
                                          onCapture,
                                          mode = 'match',
                                          autoCapture = false
                                      }: CameraCaptureProps) {
    const [activeTab, setActiveTab] = useState<string>(mode === 'match' ? 'selfie' : 'register');
    const webcamRef = useRef<Webcam>(null);
    const [cameraError, setCameraError] = useState<boolean>(false);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const [showLivenessCheck, setShowLivenessCheck] = useState<boolean>(false);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const handleUserMedia = useCallback(() => {
        setCameraError(false);
    }, []);

    const handleUserMediaError = useCallback(() => {
        setCameraError(true);
        toast.error("Unable to access camera", {
            description: "Please check your browser permissions",
            closeButton: true
        });
    }, []);

    const captureImage = useCallback(() => {
        if (webcamRef.current) {
            setIsCapturing(true);

            // Add a slight delay to show the capturing animation
            setTimeout(() => {
                if (webcamRef.current) {
                    // Take screenshot
                    const imageSrc = webcamRef.current.getScreenshot();

                    if (imageSrc) {
                        setCapturedImage(imageSrc);
                        setIsCapturing(false);

                        // Instead of immediately passing the image to the parent,
                        // start the liveness check
                        setShowLivenessCheck(true);
                    } else {
                        toast.error("Failed to capture image", {
                            closeButton: true
                        });
                        setIsCapturing(false);
                    }
                } else {
                    setIsCapturing(false);
                }
            }, 500);
        }
    }, []);

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error("File is too large", {
                    description: "Please upload an image less than 5MB",
                    closeButton: true
                });
                return;
            }

            const reader = new FileReader();
            reader.onload = async (e) => {
                const result = e.target?.result as string;
                if (result) {
                    try {
                        // Check if the uploaded image contains a face using Rekognition
                        const response = await fetch('/api/face-detection', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({ image: result }),
                        });

                        if (response.ok) {
                            const detectionResult = await response.json();

                            if (detectionResult.faceDetails && detectionResult.faceDetails.length > 0) {
                                // Face found, proceed
                                onCapture(result);
                                toast.success("Face detected in image!", {
                                    closeButton: true
                                });
                            } else {
                                // No face found, reject
                                toast.error("No face detected in this image", {
                                    description: "Please upload an image with a clearly visible face",
                                    closeButton: true
                                });
                            }
                        } else {
                            // If API call fails, just use the image
                            onCapture(result);
                            toast.success("Image uploaded successfully!", {
                                closeButton: true
                            });
                        }
                    } catch (error) {
                        // If face detection fails, just use the image
                        console.error("Face detection error:", error);
                        onCapture(result);
                        toast.success("Image uploaded successfully!", {
                            closeButton: true
                        });
                    }
                }
            };
            reader.onerror = () => {
                toast.error("Failed to read file", {
                    closeButton: true
                });
            };
            reader.readAsDataURL(file);
        }
    };

    // Handle successful liveness check
    const handleLivenessPassed = (imageSrc: string) => {
        // Clear the liveness check
        setShowLivenessCheck(false);

        // Pass the image to the parent component
        onCapture(imageSrc);
        toast.success("Image captured successfully!", {
            closeButton: true
        });
    };

    // Cancel liveness check
    const handleLivenessCancel = () => {
        setShowLivenessCheck(false);
        setCapturedImage(null);
    };

    // Determine labels based on mode
    const selfieLabel = mode === 'match' ? 'Match Me' : 'Selfie';
    const uploadLabel = mode === 'match' ? 'Show Photo' : 'Register Me';

    // If showing liveness check, render only that component
    if (showLivenessCheck) {
        return (
            <LivenessDetection
                onLivenessPassed={handleLivenessPassed}
                onCancel={handleLivenessCancel}
            />
        );
    }

    return (
        <Card className="border-slate-200 dark:border-slate-700 md:max-w-full overflow-hidden">
            <CardContent className="p-6">
                <Tabs
                    defaultValue={activeTab}
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full"
                >
                    <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="selfie" className="flex items-center gap-2">
                            <Camera size={16} />
                            <span>{selfieLabel}</span>
                        </TabsTrigger>
                        <TabsTrigger value="upload" className="flex items-center gap-2">
                            <Upload size={16} />
                            <span>{uploadLabel}</span>
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="selfie" className="mt-0">
                        {cameraError ? (
                            <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                                <p className="mb-4 text-slate-800 dark:text-slate-200 font-medium">
                                    Camera access denied or not available
                                </p>
                                <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                                    Please check your browser permissions or try uploading an image instead.
                                </p>
                                <Button onClick={() => setActiveTab('upload')} variant="secondary">
                                    Switch to Upload
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-6">
                                <div className="relative overflow-hidden rounded-lg bg-black">
                                    <Webcam
                                        audio={false}
                                        ref={webcamRef}
                                        screenshotFormat="image/jpeg"
                                        videoConstraints={{
                                            facingMode: "user",
                                            width: { ideal: 640 },
                                            height: { ideal: 480 }
                                        }}
                                        onUserMedia={handleUserMedia}
                                        onUserMediaError={handleUserMediaError}
                                        className="w-full aspect-video object-cover"
                                    />

                                    {/* Camera overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className={`
                                            border-2 ${isCapturing ? 'border-indigo-500 animate-pulse' : 'border-white border-opacity-50'} 
                                            rounded-full w-40 h-40 flex items-center justify-center
                                        `}>
                                            {/* Dots around circle */}
                                            <div className="absolute w-full h-full">
                                                {[...Array(12)].map((_, i) => {
                                                    const angle = (i / 12) * Math.PI * 2;
                                                    const x = 50 + 45 * Math.cos(angle);
                                                    const y = 50 + 45 * Math.sin(angle);
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`
                                                                absolute w-1 h-1 rounded-full bg-white
                                                                ${isCapturing ? 'bg-indigo-500' : ''} 
                                                            `}
                                                            style={{ left: `${x}%`, top: `${y}%` }}
                                                        ></div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={captureImage}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                    disabled={cameraError || isCapturing}
                                >
                                    {isCapturing ? "Capturing..." : "Take Photo"}
                                </Button>

                                <p className="text-sm text-center text-slate-500">
                                    A liveness check will be performed to verify you&#39;re a real person
                                </p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="upload" className="mt-0">
                        <div className="flex flex-col gap-4">
                            <label
                                htmlFor="image-upload"
                                className="
                                    border-2 border-dashed border-slate-300 dark:border-slate-700
                                    rounded-lg p-8 flex flex-col items-center justify-center
                                    cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50
                                    transition-colors
                                "
                            >
                                <div className="text-center">
                                    <div className="mx-auto w-12 h-12 mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                        <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                                    </div>
                                    <p className="mb-2 text-base font-medium text-slate-700 dark:text-slate-300">
                                        {mode === 'match' ? 'Upload a photo to match' : 'Upload a photo to register'}
                                    </p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        PNG, JPG or JPEG (max 5MB)
                                    </p>
                                </div>
                                <input
                                    id="image-upload"
                                    type="file"
                                    accept="image/png, image/jpeg, image/jpg"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </label>
                            <p className="text-sm text-center text-slate-500">
                                Uploaded images must contain a clearly visible face
                            </p>
                        </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}