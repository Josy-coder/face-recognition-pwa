import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/layout';
import { Camera, Upload } from 'lucide-react';
import SimpleCameraCapture from '@/components/capture/SimpleCameraCapture';

export default function HomePage() {
  const router = useRouter();
  const [, setIsLoggedIn] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadMode, setUploadMode] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);

  // Handle captured image
  const handleCapture = async (imageSrc: string) => {
    try {
      // Check if face is detected in the image
      const response = await fetch('/api/face-detection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageSrc }),
      });

      const data = await response.json();

      if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
        // Store captured image in localStorage
        localStorage.setItem('faceRecog_searchImage', imageSrc);
        localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(['PNG']));

        // Navigate to search page
        router.push('/search');
      } else {
        alert('No face detected in the image. Please try again.');
      }
    } catch (error) {
      console.error('Face detection error:', error);
      alert('Error detecting face. Please try again.');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check if file is an image
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      if (e.target?.result) {
        const imageSrc = e.target.result as string;

        try {
          // Check if face is detected in the image
          const response = await fetch('/api/face-detection', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageSrc }),
          });

          const data = await response.json();

          if (response.ok && data.faceDetails && data.faceDetails.length > 0) {
            // Store image in localStorage
            localStorage.setItem('faceRecog_searchImage', imageSrc);
            localStorage.setItem('faceRecog_selectedFolders', JSON.stringify(['PNG']));

            // Navigate to search page
            router.push('/search');
          } else {
            alert('No face detected in the uploaded image. Please try a different photo.');
          }
        } catch (error) {
          console.error('Face detection error:', error);
          alert('Error detecting face in the uploaded image');
        }
      }
    };
    reader.readAsDataURL(file);
  };

  return (
      <>
        <Head>
          <title>PNG Pess Book</title>
          <meta name="description" content="PNG Pess Book - A platform to register faces of PNG people" />
        </Head>
        <Layout title="" showHistory={false} showNewSearch={false}>
          <div className="max-w-4xl mx-auto">
            <Card className="border-none mb-8">
              <CardContent className="p-6">
                {!showCamera ? (
                    <div className="flex flex-col items-center">
                      <p className="mb-6 text-center text-slate-700">
                        Take a photo or upload an image to find matches in our database.
                      </p>

                      <div className="flex justify-center space-x-4 mb-8">
                        <Button
                            onClick={() => {
                              setShowCamera(true);
                              setUploadMode(false);
                            }}
                            className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                        >
                          <Camera size={18} className="mr-2" />
                          Use Camera
                        </Button>

                        <Button
                            onClick={() => {
                              setShowCamera(true);
                              setUploadMode(true);
                            }}
                            variant="ghost"
                            className="flex items-center border-gray"
                        >
                          <Upload size={18} className="mr-2" />
                          Upload Photo
                        </Button>
                      </div>

                    </div>
                ) : (
                    <div>
                      {!uploadMode ? (
                          <SimpleCameraCapture onCapture={handleCapture} />
                      ) : (
                          <div className="text-center">
                            <div className="border-2 border-dashed border-slate-300 rounded-lg p-12 mb-4">
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
                                <Upload size={64} className="text-slate-400 mb-4" />
                                <span className="text-lg text-slate-600 mb-2">Click to upload a photo</span>
                                <span className="text-sm text-slate-500">JPG, PNG, etc.</span>
                              </label>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => setShowCamera(false)}
                                className="mt-2 border-gray"
                            >
                              Cancel
                            </Button>
                          </div>
                      )}
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Layout>
      </>
  );
}