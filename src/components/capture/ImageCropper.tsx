import { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

interface ImageCropperProps {
    imageSrc: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
    autoCrop?: boolean;
}

export default function ImageCropper({
                                         imageSrc,
                                         onCrop,
                                         onCancel,
                                         autoCrop = true
                                     }: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10,
    });

    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);
    const [isAutoDetecting, setIsAutoDetecting] = useState(autoCrop);

    // Auto detect face and crop when component mounts
    useEffect(() => {
        if (autoCrop) {
            // Attempt to detect face using AWS Rekognition and set optimal crop
            detectFaceAndCrop();
        }
    }, [autoCrop]);

    // Function to detect face and set optimal crop
    const detectFaceAndCrop = async () => {
        try {
            setIsAutoDetecting(true);

            // Call face detection API
            const response = await fetch('/api/face-detection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ image: imageSrc }),
            });

            if (!response.ok) {
                throw new Error('Face detection failed');
            }

            const data = await response.json();

            // Check if face was detected
            if (data.faceDetails && data.faceDetails.length > 0) {
                // Get the first (presumably most prominent) face
                const face = data.faceDetails[0];

                // Extract bounding box (normalized coordinates)
                const { BoundingBox } = face;

                if (BoundingBox) {
                    // Convert to crop coordinates (% based)
                    const newCrop: Crop = {
                        unit: '%',
                        width: BoundingBox.Width * 100 * 1.5, // Enlarge slightly
                        height: BoundingBox.Height * 100 * 1.5, // Enlarge slightly
                        x: Math.max(0, BoundingBox.Left * 100 - BoundingBox.Width * 100 * 0.25), // Center
                        y: Math.max(0, BoundingBox.Top * 100 - BoundingBox.Height * 100 * 0.25), // Center
                    };

                    // Ensure crop doesn't exceed image bounds
                    if (newCrop.x + newCrop.width > 100) newCrop.width = 100 - newCrop.x;
                    if (newCrop.y + newCrop.height > 100) newCrop.height = 100 - newCrop.y;

                    // Apply the crop
                    setCrop(newCrop);

                    // Wait for image to be fully loaded
                    if (imageRef.current) {
                        const img = imageRef.current;
                        if (img.complete) {
                            applyCrop(newCrop);
                        } else {
                            img.onload = () => applyCrop(newCrop);
                        }
                    }
                }
            } else {
                toast.warning("No face detected. Please adjust the crop manually.");
            }
        } catch (error) {
            console.error('Error in auto detection:', error);
            toast.error("Couldn't auto-detect face. Please adjust manually.");
        } finally {
            setIsAutoDetecting(false);
        }
    };

    // Apply crop to the image and save the result
    const applyCrop = (cropArea: Crop) => {
        if (!imageRef.current) return;

        const img = imageRef.current;

        const pixelCrop: PixelCrop = {
            unit: 'px',
            width: cropArea.width * img.width / 100,
            height: cropArea.height * img.height / 100,
            x: cropArea.x * img.width / 100,
            y: cropArea.y * img.height / 100,
        };

        setCompletedCrop(pixelCrop);
    };

    // Get the cropped image as a data URL
    function getCroppedImg() {
        if (!imageRef.current || !completedCrop) {
            // If no manual crop completed but we have auto crop, use that
            if (crop && autoCrop) {
                applyCrop(crop);
                setTimeout(() => getCroppedImg(), 100); // retry after a brief delay
                return;
            }

            toast.error("Please adjust the crop area", {
                closeButton: true,
            });
            return;
        }

        const canvas = document.createElement('canvas');
        const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
        const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

        // Make the canvas size match the crop size
        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            toast.error("Could not create canvas context", {
                closeButton: true,
            });
            return;
        }

        // Create a circular clipping path
        ctx.beginPath();
        ctx.arc(
            completedCrop.width / 2,
            completedCrop.height / 2,
            Math.min(completedCrop.width, completedCrop.height) / 2,
            0,
            2 * Math.PI
        );
        ctx.closePath();
        ctx.clip();

        // Draw the cropped image onto the canvas
        ctx.drawImage(
            imageRef.current,
            completedCrop.x * scaleX,
            completedCrop.y * scaleY,
            completedCrop.width * scaleX,
            completedCrop.height * scaleY,
            0,
            0,
            completedCrop.width,
            completedCrop.height
        );

        const croppedImageUrl = canvas.toDataURL('image/jpeg');
        onCrop(croppedImageUrl);
    }

    return (
        <Card className="w-full max-w-md mx-auto border-slate-200 dark:border-slate-700">
            <CardContent className="p-6">
                <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold mb-2">Adjust Photo</h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        {isAutoDetecting
                            ? "Auto-detecting face..."
                            : "Position the crop area to focus on the face"}
                    </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => {
                            setCompletedCrop(c);
                            applyCrop(c);
                        }}
                        aspect={1}
                        circularCrop
                        className="max-w-full mx-auto"
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            alt="Upload"
                            className="max-w-full mx-auto"
                            onLoad={() => {
                                if (autoCrop && crop) {
                                    applyCrop(crop);
                                }
                            }}
                        />
                    </ReactCrop>
                </div>

                <div className="mt-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    <p>Drag the circular area to adjust the position</p>
                </div>
            </CardContent>

            <CardFooter className="flex justify-between p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
                <Button variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button onClick={getCroppedImg} className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600">
                    Confirm
                </Button>
            </CardFooter>
        </Card>
    );
}