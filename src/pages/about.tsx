import Head from 'next/head';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Layout from '@/components/layout/layout';
import { useRouter } from 'next/router';

export default function AboutPage() {
    const router = useRouter();

    return (
        <>
            <Head>
                <title>About PNG Pess Book</title>
                <meta name="description" content="About PNG Pess Book - A platform to register faces of PNG people" />
            </Head>
            <Layout title="" showHistory={false} showNewSearch={false}>
                <div className="max-w-4xl mx-auto">
                    <Card className="border-none shadow-none mb-8">
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <div>
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

                                <div className="bg-amber-100 p-6 rounded-lg">
                                    <h2 className="text-lg font-semibold text-amber-800 mb-2">For Organizations, Provinces, and Districts</h2>
                                    <p className="text-amber-700">
                                        If you would like to use this platform to keep a registry of people in your organization or in your village, you are welcome to contact us. This platform can be customized to meet your specific needs.
                                    </p>
                                    <div className="mt-4">
                                        <Button className="bg-amber-500 hover:bg-amber-600">
                                            Contact Us
                                        </Button>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-semibold text-indigo-700 mb-3">Our Collections</h2>
                                    <div className="space-y-4">
                                        <div>
                                            <h3 className="text-lg font-medium text-indigo-600 mb-1">PNG Pessbook</h3>
                                            <p className="text-slate-600">
                                                The main national registry for all PNG citizens. You can self-register by taking a selfie. This collection serves as a central repository for facial recognition across the country.
                                            </p>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium text-indigo-600 mb-1">Autonomous Region of Bougainville (ARB) Pessbook</h3>
                                            <p className="text-slate-600">
                                                Special registry for citizens of the Autonomous Region of Bougainville. This collection is managed in coordination with the ARB authorities to provide identity services specific to the region.
                                            </p>
                                        </div>

                                        <div>
                                            <h3 className="text-lg font-medium text-indigo-600 mb-1">MKA Pessbook</h3>
                                            <p className="text-slate-600">
                                                Special registry for the Motu Koitabu Assembly region. This collection focuses on the unique needs of the MKA communities and helps maintain their distinct identity.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-xl font-semibold text-indigo-700 mb-3">How It Works</h2>
                                    <div className="space-y-3">
                                        <p className="text-slate-700">
                                            The PNG Pess Book uses advanced facial recognition technology to match faces against our database. The process is simple:
                                        </p>
                                        <ol className="list-decimal pl-5 space-y-2 text-slate-700">
                                            <li>Take a selfie or upload a photo</li>
                                            <li>Confirm the photo you want to use for matching</li>
                                            <li>View the results showing potential matches from our database</li>
                                        </ol>
                                        <p className="text-slate-700">
                                            For registration, we require additional steps to verify your identity and collect necessary information to create your profile.
                                        </p>
                                    </div>
                                </div>

                                <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
                                    <p>Note: Only selfie mode is allowed for personal registration. These three membership datasets are part of our community trial projects and trial photo books can be obtained from us. All new registration will require you agreeing to provide your data and photo, at will.</p>
                                    <p className="mt-2">Thank you<br />Project Admin</p>
                                </div>

                                <div className="text-center mt-4">
                                    <Button
                                        onClick={() => router.push('/')}
                                        className="bg-indigo-600 hover:bg-indigo-700"
                                    >
                                        Back to Home
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </Layout>
        </>
    );
}