import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const PWAInstallPrompt: React.FC = () => {
    const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as unknown as { standalone: boolean }).standalone ||
            document.referrer.includes('android-app://');

        // Don't show the prompt if already installed as PWA
        if (isStandalone) {
            return;
        }

        // Check if already dismissed recently
        const lastDismissed = localStorage.getItem('pwaPromptDismissed');
        if (lastDismissed) {
            const dismissedTime = parseInt(lastDismissed, 10);
            // Don't show if dismissed in the last 7 days
            if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
                return;
            }
        }

        // Store the install prompt event for later use
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e as BeforeInstallPromptEvent);
            setIsVisible(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!installPrompt) return;

        // Show the install prompt
        await installPrompt.prompt();

        // Wait for the user to respond to the prompt
        const choiceResult = await installPrompt.userChoice;

        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        } else {
            console.log('User dismissed the install prompt');
        }

        // Clear the saved prompt since it can't be used twice
        setInstallPrompt(null);
        setIsVisible(false);
    };

    const handleDismiss = () => {
        localStorage.setItem('pwaPromptDismissed', Date.now().toString());
        setIsVisible(false);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 left-0 right-0 mx-auto max-w-md px-4 z-50">
            <Card className="border-indigo-200 dark:border-indigo-800 shadow-lg">
                <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-1">Install our Face Recognition App</h3>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mb-3">
                                Install this app on your device for a better experience with camera access and offline capabilities.
                            </p>
                            <Button
                                onClick={handleInstall}
                                className="bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            >
                                Install App
                            </Button>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default PWAInstallPrompt;