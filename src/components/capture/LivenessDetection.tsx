'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, CheckCircle, Loader2, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { ThemeProvider } from '@aws-amplify/ui-react';
import { FaceLivenessDetector } from '@aws-amplify/ui-react-liveness';
import '@aws-amplify/ui-react/styles.css';

// Confidence thresholds for liveness detection
const CONFIDENCE_THRESHOLDS = {
    HIGH: 90,    // Very confident - production-ready for high security
    MEDIUM: 75,  // Reasonably confident - good for most applications
    LOW: 60,     // Minimal confidence - might be suitable for testing
    TESTING: 50  // For development only
};

const REQUIRED_CONFIDENCE = process.env.NODE_ENV === 'production'
    ? CONFIDENCE_THRESHOLDS.MEDIUM  // Use medium threshold in production
    : CONFIDENCE_THRESHOLDS.LOW;    // Use lower threshold during development

interface LivenessDetectionProps {
    onLivenessPassed: (imageSrc: string) => void;
    onCancel: () => void;
}

enum LivenessState {
    INITIALIZING = 'initializing',
    READY = 'ready',
    IN_PROGRESS = 'in_progress',
    CHECKING_RESULTS = 'checking_results',
    PASSED = 'passed',
    FAILED = 'failed',
    ERROR = 'error'
}

export default function LivenessDetection({ onLivenessPassed, onCancel }: LivenessDetectionProps) {
    const [livenessState, setLivenessState] = useState<LivenessState>(LivenessState.INITIALIZING);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [instructions, setInstructions] = useState<string>('Getting ready...');
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const [confidenceScore, setConfidenceScore] = useState<number | null>(null);

    // Add custom styling for the face oval and positioning
    useEffect(() => {
        // Add styles for better oval positioning
        const styleElement = document.createElement('style');
        styleElement.textContent = `
            :root {
                --amplify-components-liveness-face-guide-oval-width: 250px;
                --amplify-components-liveness-face-guide-oval-height: 300px;
                --amplify-components-liveness-face-guide-oval-border-width: 2px;
                --amplify-components-liveness-face-guide-oval-border-color: rgba(255, 255, 255, 0.8);
                --amplify-components-liveness-face-guide-overlay-background: rgba(0, 0, 0, 0.6);
            }
            
            /* Center the oval both horizontally and vertically */
            [data-amplify-liveness-face-guide] {
                display: flex !important;
                justify-content: center !important;
                align-items: center !important;
            }
            
            /* Make sure the oval is properly centered and sized */
            [data-amplify-liveness-face-guide-oval] {
                position: relative !important;
                transform: none !important;
                left: 0 !important;
                top: 0 !important;
                width: 250px !important;
                height: 300px !important;
            }
            
            /* Center the instruction text */
            [data-amplify-liveness-hint-center-face] {
                position: absolute !important;
                top: -40px !important;
                left: 50% !important;
                transform: translateX(-50%) !important;
                background-color: rgba(0, 0, 0, 0.7) !important;
                padding: 8px 16px !important;
                border-radius: 4px !important;
                font-weight: 500 !important;
                white-space: nowrap !important;
            }
        `;
        document.head.appendChild(styleElement);

        // Clean up style element when component unmounts
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // Create a liveness session when component mounts
    useEffect(() => {
        createLivenessSession();

        // Clean up any resources when unmounting
        return () => {
            // Any cleanup code here
        };
    }, []);

    // Run a diagnostic test if we encounter errors
    const runDiagnostic = async () => {
        try {
            setInstructions('Running diagnostic...');

            const response = await fetch('/api/face-liveness/diagnostic');
            if (!response.ok) {
                throw new Error(`Diagnostic API returned ${response.status}`);
            }

            const diagnosticData = await response.json();
            console.log('Diagnostic results:', diagnosticData);

            // Show relevant diagnostic info
            let debugMessage = '';

            if (diagnosticData.aws.liveness.status === 'error') {
                debugMessage = `AWS Liveness API Error: ${diagnosticData.aws.liveness.error.name} - ${diagnosticData.aws.liveness.error.message}`;
            } else if (diagnosticData.aws.liveness.status === 'success') {
                debugMessage = `AWS Liveness API is working. Test session created with ID: ${diagnosticData.aws.liveness.sessionId}`;
            }

            setDebugInfo(debugMessage);

            return diagnosticData.aws.liveness.status === 'success';
        } catch (error) {
            console.error('Diagnostic error:', error);
            setDebugInfo(`Diagnostic failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            return false;
        }
    };

    // Create a face liveness session with AWS Rekognition
    const createLivenessSession = async () => {
        try {
            setLivenessState(LivenessState.INITIALIZING);
            setProgress(10);
            setInstructions('Creating liveness session...');
            setDebugInfo(null);

            console.log('Calling create-session API...');
            const response = await fetch('/api/face-liveness/create-session', {
                method: 'POST'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed with status ${response.status}: ${errorText}`);
            }

            const data = await response.json();
            console.log('Session created:', data);

            if (!data.sessionId) {
                throw new Error('No session ID returned from API');
            }

            setSessionId(data.sessionId);
            setLivenessState(LivenessState.READY);
            setProgress(20);
            setInstructions('Ready for liveness check. Click Start to begin.');

            toast.success('Ready for liveness check');

        } catch (error) {
            console.error('Error creating liveness session:', error);
            setErrorMessage(`Failed to initialize: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setLivenessState(LivenessState.ERROR);
            setInstructions('Error occurred. Please try again or check console for details.');

            // Run diagnostic on error
            runDiagnostic();
        }
    };

    // Handle completion of liveness analysis
    const handleAnalysisComplete = async () => {
        if (!sessionId) return;

        try {
            setLivenessState(LivenessState.CHECKING_RESULTS);
            setProgress(80);
            setInstructions('Processing liveness results...');

            // Call our server API to get the liveness results
            const response = await fetch(`/api/face-liveness/get-result?sessionId=${sessionId}`);

            if (!response.ok) {
                throw new Error(`Error getting liveness results: ${response.status}`);
            }

            const data = await response.json();
            console.log('Liveness results:', data);

            // Store confidence score for display
            if (data.confidence) {
                setConfidenceScore(data.confidence);
            }

            // Check if the liveness check passed with sufficient confidence
            if (data.status === 'SUCCEEDED') {
                if (data.confidence && data.confidence >= REQUIRED_CONFIDENCE) {
                    // High enough confidence success
                    setLivenessState(LivenessState.PASSED);
                    setProgress(100);
                    setInstructions('Liveness check passed!');
                    toast.success('Liveness check passed!');

                    // Pass the reference image back to the parent component
                    if (data.referenceImage && data.referenceImage.imageData) {
                        onLivenessPassed(data.referenceImage.imageData);
                    } else {
                        // If no reference image, we could take a screenshot or get the image some other way
                        throw new Error('No reference image returned from liveness check');
                    }
                } else {
                    // Low confidence - treat as a different kind of failure
                    setLivenessState(LivenessState.FAILED);
                    setErrorMessage(`Liveness check passed but confidence too low (${data.confidence ? data.confidence.toFixed(1) : 0}%). Minimum required: ${REQUIRED_CONFIDENCE}%`);
                    setProgress(100);
                    setInstructions('Liveness verification failed due to low confidence. Please try again with better lighting and positioning.');
                    toast.error('Liveness check failed - low confidence');
                }
            } else if (data.status === 'FAILED') {
                setLivenessState(LivenessState.FAILED);
                setErrorMessage(`Liveness check failed. ${data.confidence ? `Confidence: ${data.confidence.toFixed(1)}%` : ''}`);
                setProgress(100);
                setInstructions('Liveness check failed. Please try again.');
                toast.error('Liveness check failed');
            } else {
                // Handle unexpected status
                throw new Error(`Unexpected liveness status: ${data.status}`);
            }
        } catch (error) {
            console.error('Error handling liveness analysis:', error);
            setLivenessState(LivenessState.ERROR);
            setErrorMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            setInstructions('Error occurred. Please try again.');
            toast.error('Liveness check error');
        }
    };

    const handleLivenessError = (error: any) => {
        console.error('Face liveness error:', error);
        setLivenessState(LivenessState.ERROR);
        setErrorMessage(`Liveness error: ${error.message || 'Unknown error'}`);
        setInstructions('Error occurred. Please try again.');
        toast.error('Liveness check error');
    };

    // Handle user cancellation
    const handleUserCancel = () => {
        setLivenessState(LivenessState.READY);
        setInstructions('Ready for liveness check. Click Start to begin.');
        toast.info('Liveness check cancelled');
    };

    // Retry the liveness check
    const retryLivenessCheck = () => {
        setErrorMessage('');
        setDebugInfo(null);
        setConfidenceScore(null);
        createLivenessSession();
    };

    // Render the appropriate content based on liveness state
    const renderContent = () => {
        switch (livenessState) {
            case LivenessState.INITIALIZING:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Initializing...</h3>
                        <p className="text-sm text-muted-foreground">
                            Setting up the liveness check session.
                        </p>
                    </div>
                );

            case LivenessState.READY:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Ready for Liveness Check</h3>
                        <p className="text-sm text-muted-foreground mb-6">
                            Click the button below to start the liveness check. You&#39;ll be asked to follow some simple instructions.
                        </p>
                        <Button
                            className="bg-primary hover:bg-primary/90"
                            onClick={() => setLivenessState(LivenessState.IN_PROGRESS)}
                        >
                            Start Liveness Check
                        </Button>
                    </div>
                );

            case LivenessState.IN_PROGRESS:
                if (!sessionId) {
                    return (
                        <div className="text-center p-8">
                            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                                <AlertCircle className="h-8 w-8 text-destructive" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Session Error</h3>
                            <p className="text-sm text-muted-foreground mb-6">
                                No valid session ID available. Please try again.
                            </p>
                            <Button onClick={retryLivenessCheck}>
                                Retry
                            </Button>
                        </div>
                    );
                }

                return (
                    <ThemeProvider>
                        <FaceLivenessDetector
                            sessionId={sessionId}
                            region={process.env.NEXT_PUBLIC_AWS_LIVENESS_REGION || 'ap-northeast-1'}
                            onAnalysisComplete={handleAnalysisComplete}
                            onError={handleLivenessError}
                            onUserCancel={handleUserCancel}
                        />
                    </ThemeProvider>
                );

            case LivenessState.CHECKING_RESULTS:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Processing Results</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            Analyzing your liveness check results...
                        </p>
                        <Progress value={progress} className="h-2 w-64 mx-auto" />
                    </div>
                );

            case LivenessState.PASSED:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Liveness Check Passed</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            You&#39;ve successfully completed the liveness check!
                        </p>
                        {confidenceScore && (
                            <p className="text-xs text-muted-foreground mb-6">
                                Confidence score: {confidenceScore.toFixed(1)}%
                            </p>
                        )}
                    </div>
                );

            case LivenessState.FAILED:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Liveness Check Failed</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {errorMessage || "Your liveness check did not pass. Please try again."}
                        </p>

                        {errorMessage.includes('confidence too low') && (
                            <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-md mb-6 mx-auto max-w-md">
                                <h4 className="font-medium text-sm mb-2">Tips for better results:</h4>
                                <ul className="text-xs text-left list-disc pl-4 space-y-1">
                                    <li>Make sure your face is well lit from the front</li>
                                    <li>Remove glasses if possible</li>
                                    <li>Look directly at the camera</li>
                                    <li>Keep a neutral expression</li>
                                    <li>Hold the phone at eye level</li>
                                </ul>
                            </div>
                        )}

                        <Button
                            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                            onClick={retryLivenessCheck}
                        >
                            <RefreshCcw size={16} />
                            Try Again
                        </Button>
                    </div>
                );

            case LivenessState.ERROR:
                return (
                    <div className="text-center p-8">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">Error</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            {errorMessage || "An error occurred during the liveness check."}
                        </p>
                        {debugInfo && (
                            <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-md text-xs font-mono text-left mb-6 mx-auto max-w-md overflow-auto">
                                <details>
                                    <summary className="cursor-pointer">Debug Information</summary>
                                    <div className="pt-2 whitespace-pre-wrap break-words">
                                        {debugInfo}
                                    </div>
                                </details>
                            </div>
                        )}
                        <div className="flex gap-3 justify-center">
                            <Button
                                variant="ghost"
                                onClick={() => runDiagnostic()}
                            >
                                Run Diagnostic
                            </Button>
                            <Button
                                className="bg-primary hover:bg-primary/90 flex items-center gap-2"
                                onClick={retryLivenessCheck}
                            >
                                <RefreshCcw size={16} />
                                Try Again
                            </Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700 md:max-w-full overflow-hidden">
            <CardContent className="p-0 relative">
                <div className="text-center py-4 border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-lg font-semibold">Face Liveness Check</h2>
                    <p className="text-sm text-slate-500">
                        {instructions}
                    </p>
                </div>

                {renderContent()}

                {livenessState !== LivenessState.IN_PROGRESS && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-between">
                        <Button
                            variant="ghost"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>

                        {livenessState === LivenessState.PASSED && (
                            <Button
                                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                                onClick={() => {/* Already handled by onLivenessPassed */}}
                            >
                                Continue
                            </Button>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}