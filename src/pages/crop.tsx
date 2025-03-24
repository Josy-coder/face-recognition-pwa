import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '@/components/layout/layout';
import ImageCropper from '@/components/capture/ImageCropper';
import LoadingSkeleton from '@/components/loading';

export default function CropPage() {
    const router = useRouter();
    const [imageSrc, setImageSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Get image from localStorage (already stored from home page)
        const storedImage = localStorage.getItem('faceRecog_originalImage');

        if (storedImage) {
            setImageSrc(storedImage);
            setIsLoading(false);
        } else {
            // If no image is found, redirect to home
            router.push('/');
        }
    }, [router]);

    const handleCrop = (croppedImage: string) => {
        // Store the cropped image in localStorage
        localStorage.setItem('faceRecog_searchImage', croppedImage);

        // Navigate to search page
        try {
            router.push('/search');
        } catch (error) {
            // Fallback to direct navigation if router fails
            window.location.href = '/search';
        }
    };

    const handleCancel = () => {
        // Navigate back to home
        router.push('/');
    };

    if (isLoading) {
        return (
            <Layout showHistory={false}>
                <LoadingSkeleton />
            </Layout>
        );
    }

    if (!imageSrc) {
        return (
            <Layout showHistory={false}>
                <div className="max-w-md mx-auto text-center">
                    <p className="text-red-500 dark:text-red-400">No image provided. Redirecting...</p>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showHistory={false}>
            <ImageCropper
                imageSrc={imageSrc}
                onCrop={handleCrop}
                onCancel={handleCancel}
            />
        </Layout>
    );
}