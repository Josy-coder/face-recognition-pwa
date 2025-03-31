import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Webcam from 'react-webcam';
import { AlertCircle, CheckCircle, Loader2, RefreshCcw } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

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
    const webcamRef = useRef<Webcam>(null);
    const [livenessState, setLivenessState] = useState<LivenessState>(LivenessState.INITIALIZING);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [progress, setProgress] = useState<number>(0);
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [instructions, setInstructions] = useState<string>('Getting ready...');
    const [resultCheckCount, setResultCheckCount] = useState<number>(0);
    const [debugInfo, setDebugInfo] = useState<string | null>(null);
    const maxResultChecks = 10; // Maximum number of result check attempts
    const resultCheckInterval = useRef<NodeJS.Timeout | null>(null);

    // Create a liveness session when component mounts
    useEffect(() => {
        createLivenessSession();

        // Clean up any intervals on unmount
        return () => {
            if (resultCheckInterval.current) {
                clearInterval(resultCheckInterval.current);
            }
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
            setInstructions('Position your face in the center and click "Start"');

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

    // Start the liveness detection process
    const startLivenessCheck = () => {
        if (!sessionId) {
            setErrorMessage('No session ID available. Please try again.');
            setLivenessState(LivenessState.ERROR);
            return;
        }

        setLivenessState(LivenessState.IN_PROGRESS);
        setProgress(30);
        setInstructions('Please keep your face centered and follow the prompts...');

        toast.info('Liveness check in progress');

        // Simulate the liveness check process
        // In a real implementation, you would use AWS Rekognition JavaScript SDK
        // to stream video for liveness analysis

        // For this simulation, we'll wait 5 seconds and then check for results
        setTimeout(() => {
            setLivenessState(LivenessState.CHECKING_RESULTS);
            setProgress(60);
            setInstructions('Processing... please wait');
            startCheckingResults();
        }, 5000);
    };

    // Start checking for liveness results
    const startCheckingResults = () => {
        setResultCheckCount(0);

        // Clear any existing interval
        if (resultCheckInterval.current) {
            clearInterval(resultCheckInterval.current);
        }

        // Check for results every 2 seconds
        resultCheckInterval.current = setInterval(() => {
            checkLivenessResults();
        }, 2000);
    };

    // Check liveness results from the API
    const checkLivenessResults = async () => {
        if (!sessionId) return;

        try {
            console.log(`Checking results for session ${sessionId}, attempt ${resultCheckCount + 1}/${maxResultChecks}`);

            const response = await fetch(`/api/face-liveness/get-result?sessionId=${sessionId}`);
            console.log('Result API response status:', response.status);

            if (!response.ok) {
                let errorMessage = '';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || `Error ${response.status}`;

                    // If the session is not found or expired, we may need to create a new one
                    if (errorData.error === 'SessionNotFoundException' || errorData.error === 'SessionExpiredException') {
                        if (resultCheckCount >= maxResultChecks) {
                            throw new Error('Liveness check timed out. Please try again.');
                        }

                        // Increment counter and continue checking
                        setResultCheckCount(prev => prev + 1);
                        return;
                    }
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                } catch (e) {
                    // If we couldn't parse the response as JSON
                    const text = await response.text();
                    errorMessage = `Error ${response.status}: ${text.substring(0, 100)}`;
                }

                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Liveness result data:', data);

            // Clear the interval as we got a response
            if (resultCheckInterval.current) {
                clearInterval(resultCheckInterval.current);
                resultCheckInterval.current = null;
            }

            // Check the status of the liveness check
            if (data.status === 'SUCCEEDED' && data.confidence && data.confidence >= 90) {
                // Success - use reference image if available
                setLivenessState(LivenessState.PASSED);
                setProgress(100);
                setInstructions('Liveness check passed!');

                toast.success('Liveness check passed!');

                if (data.referenceImage && data.referenceImage.imageData) {
                    // Use the reference image from the API
                    onLivenessPassed(data.referenceImage.imageData);
                } else {
                    // Fallback to capturing our own image
                    const imageSrc = webcamRef.current?.getScreenshot();
                    if (imageSrc) {
                        onLivenessPassed(imageSrc);
                    } else {
                        throw new Error('Failed to capture image after liveness check');
                    }
                }
            } else if (data.status === 'FAILED') {
                setLivenessState(LivenessState.FAILED);
                setErrorMessage('Liveness check failed. Please try again.');
                setProgress(100);
                setInstructions('Liveness check failed');

                toast.error('Liveness check failed');
            } else if (data.status === 'IN_PROGRESS' || data.status === 'CREATED') {
                // Still in progress, continue checking
                if (resultCheckCount >= maxResultChecks) {
                    throw new Error('Liveness check timed out. Please try again.');
                }

                // Increment counter and continue checking
                setResultCheckCount(prev => prev + 1);

                // Restart the interval
                if (!resultCheckInterval.current) {
                    resultCheckInterval.current = setInterval(() => {
                        checkLivenessResults();
                    }, 2000);
                }
            } else {
                throw new Error(`Unexpected liveness status: ${data.status}`);
            }
        } catch (error) {
            console.error('Error checking liveness results:', error);

            // Clear any existing interval
            if (resultCheckInterval.current) {
                clearInterval(resultCheckInterval.current);
                resultCheckInterval.current = null;
            }

            setLivenessState(LivenessState.ERROR);
            setErrorMessage((error as Error).message || 'Failed to verify liveness. Please try again.');
            setInstructions('Error occurred');

            toast.error('Liveness check error');

            // Run diagnostic if we reached max result checks
            if (resultCheckCount >= maxResultChecks) {
                runDiagnostic();
            }
        }
    };

    // Retry the liveness check
    const retryLivenessCheck = () => {
        setErrorMessage('');
        setDebugInfo(null);
        createLivenessSession();
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700 md:max-w-full overflow-hidden">
            <CardContent className="p-6">
                <div className="text-center mb-4">
                    <h2 className="text-lg font-semibold">Face Liveness Check</h2>
                    <p className="text-sm text-slate-500">
                        {instructions}
                    </p>
                </div>

                <div className="relative overflow-hidden rounded-lg bg-black mb-4">
                    <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        videoConstraints={{
                            facingMode: "user",
                            width: { ideal: 640 },
                            height: { ideal: 480 }
                        }}
                        className="w-full aspect-video object-cover"
                    />

                    {/* Liveness detection overlay */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        {/* Face outline guide */}
                        <div className={`
                           rounded-full w-64 h-64 border-2
                           ${livenessState === LivenessState.READY ? 'border-white' : ''}
                           ${livenessState === LivenessState.IN_PROGRESS ? 'border-yellow-400 animate-pulse' : ''}
                           ${livenessState === LivenessState.CHECKING_RESULTS ? 'border-blue-400' : ''}
                           ${livenessState === LivenessState.PASSED ? 'border-green-500' : ''}
                           ${livenessState === LivenessState.FAILED ? 'border-red-500' : ''}
                           ${livenessState === LivenessState.ERROR ? 'border-red-500' : ''}
                           ${livenessState === LivenessState.INITIALIZING ? 'border-white border-opacity-50' : ''}
                         `}></div>

                        {livenessState === LivenessState.PASSED && (
                            <div className="bg-green-500/80 rounded-full w-24 h-24 flex items-center justify-center">
                                <CheckCircle className="h-12 w-12 text-white" />
                            </div>
                        )}

                        {livenessState === LivenessState.FAILED && (
                            <div className="bg-red-500/80 rounded-full w-24 h-24 flex items-center justify-center">
                                <AlertCircle className="h-12 w-12 text-white" />
                            </div>
                        )}

                        {(livenessState === LivenessState.INITIALIZING || livenessState === LivenessState.CHECKING_RESULTS) && (
                            <div className="bg-black/60 rounded-lg p-4 max-w-xs text-center">
                                <Loader2 className="h-8 w-8 text-white mx-auto animate-spin mb-2" />
                                <p className="text-white">
                                    {livenessState === LivenessState.INITIALIZING ? 'Initializing...' : 'Verifying...'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    {livenessState !== LivenessState.PASSED && progress > 0 && (
                        <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-center text-slate-500">
                                {progress}% complete
                            </p>
                        </div>
                    )}

                    {errorMessage && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-md text-red-800 dark:text-red-200 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {debugInfo && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3 rounded-md text-blue-800 dark:text-blue-200 text-xs font-mono">
                            <details>
                                <summary className="cursor-pointer">Debug Information</summary>
                                <div className="pt-2 whitespace-pre-wrap break-words">
                                    {debugInfo}
                                </div>
                            </details>
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>

                        {livenessState === LivenessState.READY && (
                            <Button
                                className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700"
                                onClick={startLivenessCheck}
                            >
                                Start Liveness Check
                            </Button>
                        )}

                        {(livenessState === LivenessState.FAILED || livenessState === LivenessState.ERROR) && (
                            <Button
                                className="flex-1 bg-indigo-600 hover:bg-indigo-700 flex items-center gap-2"
                                onClick={retryLivenessCheck}
                            >
                                <RefreshCcw size={16} />
                                Try Again
                            </Button>
                        )}

                        {livenessState === LivenessState.ERROR && (
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => runDiagnostic()}
                            >
                                Run Diagnostic
                            </Button>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}