import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';

// Dynamically import the PWA prompt component with SSR disabled
const PWAInstallPrompt = dynamic(() => import('@/components/PWAInstallPrompt'), {
    ssr: false,
});

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    showHistory?: boolean;
    showNewSearch?: boolean;
}

export default function Layout({
                                   children,
                                   title,
                                   showHistory = true,
                                   showNewSearch = false
                               }: LayoutProps) {
    const [mounted, setMounted] = useState(false);

    // Only show the PWA prompt after initial client-side render
    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 text-slate-900 dark:text-slate-100">
            <header className="border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                <div className="container mx-auto py-4 px-4 flex justify-between items-center">
                    <Link href="/" className="flex items-center space-x-2">
                        <div className="w-10 h-10 rounded-lg bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center font-bold">F</div>
                        <span className="font-semibold text-xl">FaceRecog</span>
                    </Link>

                    <div className="flex items-center space-x-4">
                        {showHistory && (
                            <Link href="/history" className="text-sm text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                History
                            </Link>
                        )}
                        {showNewSearch && (
                            <Button size="sm" onClick={() => window.location.href = '/'}>
                                New Search
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="container mx-auto py-8 px-4">
                {title && (
                    <div className="mb-6">
                        <h1 className="text-2xl font-bold text-center md:text-left">{title}</h1>
                    </div>
                )}
                {children}
            </main>

            {/* Only show PWA install prompt on client side */}
            {mounted && <PWAInstallPrompt />}
        </div>
    );
}