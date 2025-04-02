import '@/styles/globals.css';
import type { AppProps } from "next/app";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import Head from 'next/head';
import { useEffect } from 'react';
import { ThemeProvider } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css'; // Important for styling
import { configureAmplify } from '@/lib/amplify-config';

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
    // Configure Amplify only on the client side
    useEffect(() => {
        // Check if window is defined (client-side only)
        if (typeof window !== 'undefined') {
            configureAmplify();
        }
    }, []);

    return (
        <QueryClientProvider client={queryClient}>
            <ThemeProvider>
                <Head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                </Head>
                <Component {...pageProps} />
                <Toaster position="top-right" richColors />
            </ThemeProvider>
        </QueryClientProvider>
    );
}