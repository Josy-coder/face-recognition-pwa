import { NextPage } from 'next';
import { useEffect, useState } from 'react';
import Layout from '@/components/layout/layout';
import AdminPanel from '@/components/admin/AdminPanel';
import LoadingSkeleton from '@/components/loading';
import Head from 'next/head';

const AdminPage: NextPage = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Simulate loading - remove in production
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    if (isLoading) {
        return (
            <>
                <Head>
                    <title>Admin Panel - Face Recognition System</title>
                    <meta name="description" content="Admin panel for AWS Rekognition face collections" />
                </Head>
                <Layout title="Admin Panel" showHistory={false} showNewSearch={true}>
                    <LoadingSkeleton />
                </Layout>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>Admin Panel - Face Recognition System</title>
                <meta name="description" content="Admin panel for AWS Rekognition face collections" />
            </Head>
            <Layout title="Admin Panel" showHistory={false} showNewSearch={true}>
                <AdminPanel />
            </Layout>
        </>
    );
};

export default AdminPage;