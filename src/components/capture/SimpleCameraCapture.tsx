import { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface SimpleCameraCaptureProps {
    onCapture: (imageSrc: string) => void;
}

export default function SimpleCameraCapture({
                                                onCapture,
                                            }: SimpleCameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [cameraError, setCameraError] = useState<boolean>(false);
    const [isCapturing, setIsCapturing] = useState<boolean>(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

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
                        setIsCapturing(false);

                        // Pass the image directly to the parent component
                        onCapture(imageSrc);

                        toast.success("Photo captured successfully!", {
                            closeButton: true
                        });
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
    }, [onCapture]);

    // Toggle camera between front and back
    const toggleCamera = () => {
        setFacingMode(prevMode => prevMode === 'user' ? 'environment' : 'user');
        toast.success(`Switched to ${facingMode === 'user' ? 'back' : 'front'} camera`, {
            duration: 2000,
            closeButton: true
        });
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700 md:max-w-full overflow-hidden">
            <CardContent className="p-6">
                {cameraError ? (
                    <div className="text-center p-8 bg-slate-100 dark:bg-slate-800 rounded-lg">
                        <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
                        <p className="mb-4 text-slate-800 dark:text-slate-200 font-medium">
                            Camera access denied or not available
                        </p>
                        <p className="mb-6 text-sm text-slate-600 dark:text-slate-400">
                            Please check your browser permissions
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="relative overflow-hidden rounded-lg bg-black">
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={{
                                    facingMode: facingMode,
                                    width: { ideal: 640 },
                                    height: { ideal: 480 }
                                }}
                                onUserMedia={handleUserMedia}
                                onUserMediaError={handleUserMediaError}
                                className="w-full aspect-video object-cover"
                            />

                            {/* Camera switch button */}
                            <Button
                                className="absolute top-2 right-2 rounded-full w-10 h-10 p-2 bg-slate-800/70 hover:bg-slate-700 text-white"
                                onClick={toggleCamera}
                                variant="ghost"
                                size="icon"
                            >
                                <RefreshCw size={18} />
                            </Button>

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
                    </div>
                )}
            </CardContent>
        </Card>
    );
}