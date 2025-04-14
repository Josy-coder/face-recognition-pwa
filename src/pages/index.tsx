import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/layout';

export default function HomePage() {
  const router = useRouter();
  const [, setTotalImages] = useState<number | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsLoggedIn(!!token);
  }, []);

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

  // Handle face match button click
  const handleFaceMatch = () => {
    router.push('/match');
  };

  // Handle register button click
  const handleRegister = () => {
    router.push('/register');
  };

  return (
      <>
        <Head>
          <title>PNG Pess Book</title>
          <meta name="description" content="PNG Pess Book - A platform to register faces of PNG people" />
        </Head>
        <Layout title="" showHistory={false} showNewSearch={false}>
          <div className="max-w-4xl mx-auto">
            <Card className="border-none shadow-none mb-8">
              <CardContent className="p-6">
                <div className="md:flex gap-8 items-center">
                  <div className="md:w-1/2 md:pr-6 pb-6 md:pb-0">
                    <h1 className="text-3xl font-bold text-indigo-700 mb-4">Welcome to PNG Pess Book</h1>
                    <p className="mb-4 text-slate-700">
                      PNG Pessbook is a platform to register faces of PNG people. It has become an essential National Electronic Technology UI proven to be an inexpensive exercise to implement in Papua New Guinea.
                    </p>
                    <p className="mb-4 text-slate-700">
                      As a result the application of unique identity in many areas such as voting, financial inclusion and mobilization of even public servants work attendance is a challenge to achieve.
                    </p>
                    <p className="mb-4 text-slate-700">
                      This is a community based project so we encourage all organizations to join us in simple face photo to id matching. At this stage we do not know if this will be a success or not but we encourage all Papua New Guineans to participate so we the people can demonstrate our willingness to adopt technology in many challenging areas such as electronic voting.
                    </p>
                  </div>

                  <div className="md:w-1/2 text-center">

                    <div className="bg-amber-100 p-4 rounded-lg mb-6">
                      <div className="text-md font-semibold text-amber-800 mb-1">For any organization or province or district who would like to use this platform</div>
                      <div className="text-sm text-amber-700">
                        To keep a registry of people in your organization or in your village, you are welcome to contact us.
                      </div>
                    </div>

                    {!isLoggedIn && (
                        <div className="space-y-4 md:space-x-4 ">
                          <Button
                              onClick={handleFaceMatch}
                              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
                          >
                            Face Match
                          </Button>
                          <Button
                              onClick={handleRegister}
                              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600"
                          >
                            Register Now
                          </Button>

                          <div className="mt-2 text-sm text-slate-500">
                            Already registered? <Link href="/login" className="text-indigo-600 hover:underline">Login</Link>
                          </div>
                        </div>
                    )}

                    {isLoggedIn && (
                        <div className="space-y-4">
                          <Button
                              onClick={() => router.push('/profile')}
                              className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700"
                          >
                            My Profile
                          </Button>
                          <Button
                              onClick={handleFaceMatch}
                              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600"
                          >
                            Face Match
                          </Button>
                        </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="border-none shadow-md">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-2 text-indigo-700">PNG Pessbook</h2>
                  <p className="text-sm text-slate-600">
                    The main national registry for all PNG citizens. You can self-register by taking a selfie.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-2 text-indigo-700">Autonomous Region of Bougainville (ARB) Pessbook</h2>
                  <p className="text-sm text-slate-600">
                    Special registry for citizens of the Autonomous Region of Bougainville.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-none shadow-md">
                <CardContent className="p-4">
                  <h2 className="text-lg font-semibold mb-2 text-indigo-700">MKA Pessbook</h2>
                  <p className="text-sm text-slate-600">
                    Special registry for the Motu Koitabu Assembly region.
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-8 text-center text-sm text-slate-500">
              <p>Note: Only selfie mode is allowed for personal registration. These three membership datasets are part of our community trial projects and trial photo books can be obtained from us. All new registration will require you agreeing to provide your data and photo, at will.</p>
              <p className="mt-2">Thank you<br />Project Admin</p>
            </div>
          </div>
        </Layout>
      </>
  );
}