import { NextPage } from 'next';
import Head from 'next/head';
import Layout from '@/components/layout/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw } from 'lucide-react';

const OfflinePage: NextPage = () => {
    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <>
            <Head>
                <title>Offline - Face Recognition App</title>
                <meta name="description" content="You are currently offline" />
            </Head>
            <Layout title="You're Offline" showHistory={false} showNewSearch={false}>
                <Card className="max-w-md mx-auto">
                    <CardContent className="p-6 text-center">
                        <div className="flex justify-center mb-4">
                            <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                <WifiOff className="h-8 w-8 text-slate-500" />
                            </div>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Internet Connection</h2>
                        <p className="text-slate-600 dark:text-slate-400 mb-6">
                            Please check your internet connection and try again. Some features may be available offline.
                        </p>
                        <Button onClick={handleRefresh} className="flex items-center gap-2">
                            <RefreshCw size={16} />
                            Retry Connection
                        </Button>
                    </CardContent>
                </Card>
            </Layout>
        </>
    );
};

export default OfflinePage;