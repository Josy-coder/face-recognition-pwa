import { useState, useRef } from 'react';
import ReactCrop, { Crop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

interface ImageCropperProps {
    imageSrc: string;
    onCrop: (croppedImage: string) => void;
    onCancel: () => void;
}

export default function ImageCropper({ imageSrc, onCrop, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>({
        unit: '%',
        width: 80,
        height: 80,
        x: 10,
        y: 10,
    });

    const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
    const imageRef = useRef<HTMLImageElement | null>(null);

    function getCroppedImg() {
        if (!imageRef.current || !completedCrop) {
            toast.error("Please adjust the crop area", {
                closeButton: true,
            });
            return;
        }

        const canvas = document.createElement('canvas');
        const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
        const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

        canvas.width = completedCrop.width;
        canvas.height = completedCrop.height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
            toast.error("Could not create canvas context", {
                closeButton: true,
            });
            return;
        }

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
                        Position the crop area to focus on the face
                    </p>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={1}
                        circularCrop
                        className="max-w-full mx-auto"
                    >
                        <img
                            ref={imageRef}
                            src={imageSrc}
                            alt="Upload"
                            className="max-w-full mx-auto"
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