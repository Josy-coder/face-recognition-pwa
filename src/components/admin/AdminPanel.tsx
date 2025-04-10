import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Trash2, RefreshCw, Upload, FileText, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import CameraCapture from '@/components/capture/CameraCapture';
import S3FolderBrowser from '@/components/admin/S3FolderBrowser';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    convertExternalIdToS3Path,
    extractNameFromExternalId,
    groupFacesByFolder,
    convertS3PathToExternalId
} from '@/utils/path-conversion';

interface Collection {
    id: string;
    folderPath?: string;
    imageCount?: number;
}

interface Face {
    FaceId: string;
    ExternalImageId?: string;
    ImageId?: string;
    Confidence?: number;
    ImageURL?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Metadata?: any;
    s3Path?: string; // Added for converted path
}

interface FolderFaces {
    faces: Face[];
    folder: string;
    displayPath: string;
    subfolders: string[];
}

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [selectedFolderPath, setSelectedFolderPath] = useState<string>('');
    const [faces, setFaces] = useState<Face[]>([]);
    const [facesByFolder, setFacesByFolder] = useState<Record<string, FolderFaces>>({});
    const [currentFolderPath, setCurrentFolderPath] = useState<string>('');
    const [newCollectionId, setNewCollectionId] = useState('');
    const [, setNewCollectionFolder] = useState('');
    const [loading, setLoading] = useState(false);
    const [captureImage, setCaptureImage] = useState<string | null>(null);
    const [externalImageId, setExternalImageId] = useState('');
    const [progress, setProgress] = useState(0);
    const [activeTab, setActiveTab] = useState('collections');
    const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
    const [, setCurrentImagePaths] = useState<string[]>([]);
    const [, setFolderImageCounts] = useState<Record<string, number>>({});

    // Base64 encode credentials for Basic Auth
    const getAuthHeader = () => {
        return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    };

    const handleLogin = () => {
        if (!username || !password) {
            toast.error('Username and password are required');
            return;
        }

        // We'll set authenticated state and try to list collections
        setIsAuthenticated(true);
        fetchCollections();
    };

    const fetchCollections = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/collections', {
                headers: {
                    'Authorization': getAuthHeader(),
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    setIsAuthenticated(false);
                    toast.error('Authentication failed');
                    return;
                }
                throw new Error('Failed to fetch collections');
            }

            const data = await response.json();
            setCollections(data.collections || []);

            // Don't automatically select the first collection
            // This is a UI improvement requested by the user
        } catch (error) {
            console.error('Error fetching collections:', error);
            toast.error('Failed to fetch collections');
        } finally {
            setLoading(false);
        }
    };

    const createCollection = async () => {
        if (!newCollectionId) {
            toast.error('Collection ID is required');
            return;
        }

        setLoading(true);
        setProgress(10);
        try {
            const response = await fetch('/api/collections', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                },
                body: JSON.stringify({
                    collectionId: newCollectionId,
                    folderPath: selectedFolderPath || newCollectionId
                }),
            });

            setProgress(50);

            if (!response.ok) {
                throw new Error('Failed to create collection');
            }

            const data = await response.json();
            setProgress(100);
            toast.success(`Collection "${newCollectionId}" created successfully in folder "${data.folderPath}"`);
            setNewCollectionId('');
            setSelectedFolderPath('');
            fetchCollections();
        } catch (error) {
            console.error('Error creating collection:', error);
            toast.error('Failed to create collection');
        } finally {
            setLoading(false);
        }
    };

    const deleteCollection = async (collectionId: string) => {
        if (!confirm(`Are you sure you want to delete collection "${collectionId}"?`)) {
            return;
        }

        setLoading(true);
        setProgress(10);
        try {
            const response = await fetch(`/api/collections?collectionId=${collectionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': getAuthHeader(),
                },
            });

            setProgress(50);

            if (!response.ok) {
                throw new Error('Failed to delete collection');
            }

            setProgress(100);
            toast.success(`Collection "${collectionId}" deleted successfully`);

            if (selectedCollection === collectionId) {
                setSelectedCollection(null);
                setFaces([]);
                setFacesByFolder({});
            }

            fetchCollections();
        } catch (error) {
            console.error('Error deleting collection:', error);
            toast.error('Failed to delete collection');
        } finally {
            setLoading(false);
        }
    };

    const fetchFaces = async (collectionId: string) => {
        setLoading(true);
        setProgress(10);
        try {
            const response = await fetch(`/api/collections/${collectionId}/faces`, {
                headers: {
                    'Authorization': getAuthHeader(),
                },
            });

            setProgress(50);

            if (!response.ok) {
                throw new Error('Failed to fetch faces');
            }

            const data = await response.json();

            // Process faces to include S3 path
            const processedFaces = (data.faces || []).map((face: Face) => {
                let s3Path = face.ImageURL || '';

                // If we have ExternalImageId, convert it to S3 path format
                if (face.ExternalImageId) {
                    s3Path = convertExternalIdToS3Path(face.ExternalImageId);
                }

                return {
                    ...face,
                    s3Path
                };
            });

            setFaces(processedFaces);

            // Group faces by folder hierarchy
            const grouped = groupFacesByFolder(processedFaces);
            setFacesByFolder(grouped);
            setCurrentFolderPath(''); // Reset to root folder

            // Get current image paths for reference
            const imagePaths = processedFaces
                .filter((face: Face) => face.s3Path)
                .map((face: Face) => face.s3Path as string);

            setCurrentImagePaths(imagePaths);

            // Fetch image counts for each folder
            fetchFolderImageCounts(data.s3Folder || '');

            setProgress(100);
        } catch (error) {
            console.error('Error fetching faces:', error);
            toast.error('Failed to fetch faces');
        } finally {
            setLoading(false);
        }
    };

    const fetchFolderImageCounts = async (folderPath: string) => {
        try {
            const response = await fetch(`/api/s3/folder-stats?prefix=${encodeURIComponent(folderPath)}`, {
                headers: {
                    'Authorization': getAuthHeader(),
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch folder statistics');
            }

            const data = await response.json();
            setFolderImageCounts(data.folderCounts || {});
        } catch (error) {
            console.error('Error fetching folder statistics:', error);
        }
    };

    const addFaceToCollection = async () => {
        if (!captureImage || !selectedCollection) {
            toast.error('Image and collection are required');
            return;
        }

        setLoading(true);
        setProgress(10);
        try {
            // Find the collection's folder path
            const collection = collections.find(c => c.id === selectedCollection);
            const folderPath = collection?.folderPath || selectedCollection;

            // Prepare metadata to be stored with face
            // AWS Rekognition requires ExternalImageId to only contain alphanumeric characters,
            // underscores, hyphens, periods, and colons
            let sanitizedId = '';
            let additionalInfo = {};

            if (externalImageId) {
                // If it looks like a simple name with spaces, replace spaces with dashes
                if (/^[A-Za-z\s]+$/.test(externalImageId)) {
                    sanitizedId = externalImageId.replace(/\s+/g, '-');
                    additionalInfo = { name: externalImageId };
                } else {
                    // For more complex IDs, sanitize by removing invalid characters
                    sanitizedId = externalImageId.replace(/[^a-zA-Z0-9_\-\.:]*/g, '');

                    // Store the original value in additionalInfo
                    additionalInfo = { originalId: externalImageId };
                }
            } else {
                // Generate a timestamp-based ID if none provided
                sanitizedId = `face-${Date.now()}`;
            }

            // Add folderPath to make proper external ID
            const s3Path = `${folderPath}/${sanitizedId}.jpg`;
            const externalIdForUpload = convertS3PathToExternalId(s3Path);

            const response = await fetch(`/api/collections/${selectedCollection}/faces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                },
                body: JSON.stringify({
                    image: captureImage,
                    externalImageId: externalIdForUpload,
                    additionalInfo: {
                        ...additionalInfo,
                        folderPath
                    }
                }),
            });

            setProgress(50);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to add face to collection');
            }

            const data = await response.json();

            if (data.faceRecords && data.faceRecords.length > 0) {
                setProgress(100);
                toast.success('Face added to collection successfully');
                setCaptureImage(null);
                setExternalImageId('');
                fetchFaces(selectedCollection);
            } else if (data.unindexedFaces && data.unindexedFaces.length > 0) {
                toast.error('Could not index face. Please ensure a clear face is visible in the image.');
            } else {
                toast.warning('No faces detected in the image');
            }
        } catch (error) {
            console.error('Error adding face to collection:', error);
            toast.error('Failed to add face to collection');
        } finally {
            setLoading(false);
        }
    };

    const handleBatchUpload = async () => {
        if (!selectedCollection || uploadedFiles.length === 0) {
            toast.error('Collection and files are required');
            return;
        }

        setLoading(true);
        setProgress(10);

        try {
            // Find the collection's folder path
            const collection = collections.find(c => c.id === selectedCollection);
            const folderPath = collection?.folderPath || selectedCollection;

            // Process each file
            let successCount = 0;
            let errorCount = 0;

            for (let i = 0; i < uploadedFiles.length; i++) {
                const file = uploadedFiles[i];

                // Update progress
                const fileProgress = 10 + Math.floor((i / uploadedFiles.length) * 80);
                setProgress(fileProgress);

                try {
                    // Convert file to base64
                    const base64 = await fileToBase64(file);

                    // Create proper S3 path
                    const s3Path = `${folderPath}/${file.name}`;

                    // Convert to ExternalImageId format (replacing spaces with underscores and slashes with colons)
                    const externalIdForUpload = convertS3PathToExternalId(s3Path);

                    // Upload to S3 and index in Rekognition
                    const response = await fetch(`/api/collections/${selectedCollection}/faces`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': getAuthHeader(),
                        },
                        body: JSON.stringify({
                            image: base64,
                            externalImageId: externalIdForUpload,
                            additionalInfo: {
                                name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
                                originalFilename: file.name,
                                folderPath
                            }
                        }),
                    });

                    if (response.ok) {
                        successCount++;
                    } else {
                        errorCount++;
                    }
                } catch (fileError) {
                    console.error(`Error processing file ${file.name}:`, fileError);
                    errorCount++;
                }
            }

            setProgress(100);

            if (successCount > 0) {
                toast.success(`Successfully added ${successCount} faces to collection`);
                // Refresh the faces list
                fetchFaces(selectedCollection);
            }

            if (errorCount > 0) {
                toast.error(`Failed to add ${errorCount} faces to collection`);
            }

            // Clear the file list
            setUploadedFiles([]);
        } catch (error) {
            console.error('Error in batch upload:', error);
            toast.error('Batch upload failed');
        } finally {
            setLoading(false);
        }
    };

    // Helper function to convert file to base64
    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });
    };

    const deleteFace = async (faceId: string) => {
        if (!selectedCollection) return;

        if (!confirm('Are you sure you want to remove this face?')) {
            return;
        }

        setLoading(true);
        setProgress(10);
        try {
            const response = await fetch(`/api/collections/${selectedCollection}/faces`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                },
                body: JSON.stringify({
                    faceIds: [faceId],
                }),
            });

            setProgress(50);

            if (!response.ok) {
                throw new Error('Failed to delete face');
            }

            const data = await response.json();
            setProgress(100);

            // Show message based on whether S3 objects were also deleted
            if (data.deletedS3Objects && data.deletedS3Objects.length > 0) {
                toast.success(`Face removed and ${data.deletedS3Objects.length} S3 images deleted`);
            } else {
                toast.success('Face removed successfully');
            }

            fetchFaces(selectedCollection);
        } catch (error) {
            console.error('Error deleting face:', error);
            toast.error('Failed to delete face');
        } finally {
            setLoading(false);
        }
    };

    // Handle folder selection from S3FolderBrowser
    const handleFolderSelect = (folderPath: string) => {
        setSelectedFolderPath(folderPath);
        setNewCollectionFolder(folderPath);
    };

    // Handle file drop for batch upload
    const handleFileDrop = (files: File[]) => {
        // Filter for image files
        const imageFiles = files.filter(file =>
            file.type.startsWith('image/') && file.size < 5 * 1024 * 1024 // 5MB limit
        );

        // Show warning if some files were rejected
        if (imageFiles.length < files.length) {
            toast.warning(`${files.length - imageFiles.length} files were rejected. Only images under 5MB are allowed.`);
        }

        setUploadedFiles(prev => [...prev, ...imageFiles]);
    };

    // Remove file from upload list
    const removeFile = (index: number) => {
        setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    };

// Navigate to a specific folder in the folder hierarchy
    const navigateToFolder = (folderPath: string) => {
        setCurrentFolderPath(folderPath);
    };

// Update selected collection and fetch faces when changed
    useEffect(() => {
        if (selectedCollection) {
            fetchFaces(selectedCollection);

            // Find the folder path for this collection
            const collection = collections.find(c => c.id === selectedCollection);
            if (collection && collection.folderPath) {
                setSelectedFolderPath(collection.folderPath);
            }

            setActiveTab('faces');
        }
    }, [selectedCollection]);

    // Handle tab changes
    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    // Render folder hierarchy in the faces view
    const renderFolderHierarchy = () => {
        if (!facesByFolder || !facesByFolder['']) {
            return <div className="p-4 text-center text-slate-500">No folder hierarchy available</div>;
        }

        // Get current folder data
        const currentFolder = facesByFolder[currentFolderPath];
        if (!currentFolder) {
            return <div className="p-4 text-center text-slate-500">Folder not found</div>;
        }

        return (
            <div className="space-y-4">
                {/* Breadcrumb navigation */}
                <div className="flex items-center space-x-2 text-sm">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigateToFolder('')}
                        className={`${!currentFolderPath ? 'font-semibold text-primary' : ''}`}
                    >
                        Root
                    </Button>

                    {currentFolderPath && currentFolder.displayPath.split('/').map((part, index, array) => (
                        <div key={index} className="flex items-center">
                            <span className="mx-1">/</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    // Navigate to this level in the path
                                    const targetPath = currentFolderPath
                                        .split(':')
                                        .slice(0, index + 1)
                                        .join(':');
                                    navigateToFolder(targetPath);
                                }}
                                className={`${index === array.length - 1 ? 'font-semibold text-primary' : ''}`}
                            >
                                {part}
                            </Button>
                        </div>
                    ))}
                </div>

                {/* Faces in current folder */}
                {currentFolder.faces.length > 0 && (
                    <div>
                        <h4 className="font-medium mb-3">Faces in this folder:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentFolder.faces.map(face => {
                                const name = extractNameFromExternalId(face.ExternalImageId || '');

                                return (
                                    <Card key={face.FaceId} className="overflow-hidden">
                                        <CardContent className="p-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium truncate">
                                                        {name}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        ID: {face.FaceId.substring(0, 8)}...
                                                    </div>
                                                    {face.Confidence && (
                                                        <div className="text-xs text-slate-500">
                                                            Confidence: {face.Confidence.toFixed(2)}%
                                                        </div>
                                                    )}
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteFace(face.FaceId)}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>

                                            {/* Display face image */}
                                            {(face.ImageURL || face.s3Path) && (
                                                <div className="mt-3 border rounded-md overflow-hidden">
                                                    <img
                                                        src={face.ImageURL || face.s3Path}
                                                        alt={name}
                                                        className="w-full h-32 object-cover"
                                                        onError={(e) => {
                                                            // Fallback to placeholder if image fails to load
                                                            (e.target as HTMLImageElement).src = '/profile-placeholder.jpg';
                                                        }}
                                                    />
                                                </div>
                                            )}

                                            {/* Show external ID for debugging */}
                                            <div className="mt-2 text-xs text-slate-400 truncate">
                                                Path: {face.s3Path || convertExternalIdToS3Path(face.ExternalImageId || '')}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Subfolders */}
                {currentFolder.subfolders.length > 0 && (
                    <div className="mt-6">
                        <h4 className="font-medium mb-3">Subfolders:</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {currentFolder.subfolders.map(subfolder => {
                                const subfolderData = facesByFolder[subfolder];
                                if (!subfolderData) return null;

                                // Get folder name (last part of display path)
                                const folderName = subfolderData.displayPath.split('/').pop() || subfolder;

                                return (
                                    <Card
                                        key={subfolder}
                                        className="cursor-pointer hover:border-primary transition-colors"
                                        onClick={() => navigateToFolder(subfolder)}
                                    >
                                        <CardContent className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-slate-500">
                                                    <FolderOpen size={24} />
                                                </div>
                                                <div className="flex-grow">
                                                    <h5 className="font-medium">{folderName}</h5>
                                                    <div className="text-sm text-slate-500">
                                                        {subfolderData.faces.length} faces
                                                        {subfolderData.subfolders.length > 0 &&
                                                            `, ${subfolderData.subfolders.length} subfolders`}
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {currentFolder.faces.length === 0 && currentFolder.subfolders.length === 0 && (
                    <div className="p-6 text-center">
                        <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                        <p className="text-slate-600 dark:text-slate-400">
                            This folder is empty
                        </p>
                    </div>
                )}
            </div>
        );
    };
    if (!isAuthenticated) {
        return (
            <Card className="w-full max-w-md mx-auto">
                <CardHeader>
                    <CardTitle className="text-center">AWS Rekognition Admin</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label htmlFor="username" className="text-sm font-medium">Username</label>
                            <Input
                                id="username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Admin username"
                            />
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="password" className="text-sm font-medium">Password</label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Admin password"
                            />
                        </div>
                        <Button
                            onClick={handleLogin}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                            disabled={loading}
                        >
                            {loading ? (
                                <div className="flex items-center">
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Loading...
                                </div>
                            ) : (
                                'Login'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {loading && progress > 0 && (
                <div className="w-full mb-4">
                    <Progress value={progress} className="h-1" />
                </div>
            )}

            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>AWS Rekognition Admin Panel</CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={fetchCollections}
                        disabled={loading}
                        className="flex items-center gap-1 bg-accent"
                    >
                        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                        Refresh
                    </Button>
                </CardHeader>
                <CardContent>
                    <Tabs value={activeTab} onValueChange={handleTabChange}>
                        <TabsList className="mb-4">
                            <TabsTrigger value="collections">Collections</TabsTrigger>
                            <TabsTrigger value="faces" disabled={!selectedCollection}>Faces</TabsTrigger>
                            <TabsTrigger value="addFace" disabled={!selectedCollection}>Add Face</TabsTrigger>
                            <TabsTrigger value="batchUpload" disabled={!selectedCollection}>Batch Upload</TabsTrigger>
                        </TabsList>

                        <TabsContent value="collections">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="new-collection" className="text-sm font-medium">Collection ID</label>
                                        <Input
                                            id="new-collection"
                                            value={newCollectionId}
                                            onChange={(e) => setNewCollectionId(e.target.value)}
                                            placeholder="Collection ID (e.g., employees-collection)"
                                        />
                                    </div>

                                    <S3FolderBrowser
                                        onSelectFolder={handleFolderSelect}
                                        initialPath={selectedFolderPath}
                                        authHeader={getAuthHeader()}
                                    />

                                    <Button
                                        onClick={createCollection}
                                        className="bg-primary hover:bg-primary/90 mt-4"
                                        disabled={loading || !newCollectionId}
                                    >
                                        <Plus size={16} className="mr-2" />
                                        Create Collection
                                    </Button>
                                </div>

                                <div className="flex flex-col border rounded-md overflow-hidden">
                                    <div className="bg-primary p-3 text-accent font-medium">
                                        Your Collections
                                    </div>
                                    {collections.length === 0 ? (
                                        <div className="p-4 text-center text-slate-500">
                                            {loading ? 'Loading collections...' : 'No collections found'}
                                        </div>
                                    ) : (
                                        <div className="divide-y">
                                            {collections.map((collection) => (
                                                <div
                                                    key={collection.id}
                                                    className={`p-3 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer ${
                                                        selectedCollection === collection.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : ''
                                                    }`}
                                                    onClick={() => setSelectedCollection(collection.id)}
                                                >
                                                    <div>
                                                        <div className="font-medium">{collection.id}</div>
                                                        <div className="text-sm text-slate-500 flex items-center gap-1">
                                                            <FolderOpen size={14} />
                                                            {collection.folderPath || collection.id}
                                                        </div>
                                                        {collection.imageCount !== undefined && (
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {collection.imageCount && collection.imageCount >= 999 ? '999+' : collection.imageCount} images
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            deleteCollection(collection.id);
                                                        }}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </TabsContent>

                        <TabsContent value="faces">
                            {selectedCollection && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <div className="text-lg font-medium">
                                            Faces in Collection: {selectedCollection}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fetchFaces(selectedCollection)}
                                            className="flex items-center gap-1 bg-accent"
                                        >
                                            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                                            Refresh
                                        </Button>
                                    </div>

                                    {loading ? (
                                        <div className="text-center p-8">Loading faces...</div>
                                    ) : faces.length === 0 ? (
                                        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-md">
                                            <AlertCircle className="mx-auto h-12 w-12 text-slate-400 mb-4" />
                                            <p className="text-slate-600 dark:text-slate-400">
                                                No faces found in this collection
                                            </p>
                                        </div>
                                    ) : (
                                        <div>
                                            {/* Render folder hierarchy view */}
                                            {renderFolderHierarchy()}
                                        </div>
                                    )}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="addFace">
                            {selectedCollection && (
                                <div className="space-y-6">
                                    <div className="text-lg font-medium">
                                        Add Face to Collection: {selectedCollection}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="space-y-2 mb-4">
                                                <label htmlFor="external-id" className="text-sm font-medium">External Image ID (Optional)</label>
                                                <Input
                                                    id="external-id"
                                                    value={externalImageId}
                                                    onChange={(e) => setExternalImageId(e.target.value)}
                                                    placeholder="Name or identifier for this face"
                                                />
                                                <p className="text-xs text-slate-500">
                                                    Providing an ID helps you identify this face later
                                                </p>
                                            </div>

                                            <CameraCapture onCapture={(imageSrc) => setCaptureImage(imageSrc)} />
                                        </div>

                                        <div className="space-y-4">
                                            {captureImage ? (
                                                <div className="space-y-4">
                                                    <div className="border rounded-md p-2 relative aspect-square">
                                                        <img
                                                            src={captureImage}
                                                            alt="Captured"
                                                            className="w-full h-full object-cover rounded"
                                                        />
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="absolute top-2 right-2 bg-white/80 text-slate-700"
                                                            onClick={() => setCaptureImage(null)}
                                                        >
                                                            Change
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="border rounded-md p-6 text-center text-slate-500 flex flex-col items-center justify-center h-full">
                                                    <p>Capture or upload an image</p>
                                                </div>
                                            )}

                                            {captureImage && (
                                                <Button
                                                    onClick={addFaceToCollection}
                                                    className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                                    disabled={loading}
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center">
                                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                                            Adding Face...
                                                        </div>
                                                    ) : (
                                                        'Add Face to Collection'
                                                    )}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="batchUpload">
                            {selectedCollection && (
                                <div className="space-y-6">
                                    <div className="text-lg font-medium mb-2">
                                        Batch Upload to Collection: {selectedCollection}
                                    </div>

                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                        Upload multiple face images at once. Each image will be indexed in the Rekognition collection
                                        and stored in S3. The filename (without extension) will be used as the external ID.
                                    </p>

                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        <div>
                                            <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-8 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <div
                                                    className="flex flex-col items-center justify-center cursor-pointer"
                                                    onDragOver={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                    }}
                                                    onDrop={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();

                                                        // Get files from drop event
                                                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                                            handleFileDrop(Array.from(e.dataTransfer.files));
                                                        }
                                                    }}
                                                >
                                                    <Upload className="h-10 w-10 text-slate-500 dark:text-slate-400 mb-4" />
                                                    <p className="mb-2 text-base font-medium text-slate-700 dark:text-slate-300">
                                                        Drop files here or click to browse
                                                    </p>
                                                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                                        Supported formats: JPG, PNG, JPEG (max 5MB per file)
                                                    </p>
                                                    <input
                                                        type="file"
                                                        id="file-upload"
                                                        className="hidden"
                                                        multiple
                                                        accept="image/jpeg,image/jpg,image/png"
                                                        onChange={(e) => {
                                                            if (e.target.files) {
                                                                handleFileDrop(Array.from(e.target.files));
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => document.getElementById('file-upload')?.click()}
                                                    >
                                                        <Upload size={16} className="mr-2" />
                                                        Browse Files
                                                    </Button>
                                                </div>
                                            </div>

                                            {uploadedFiles.length > 0 && (
                                                <Button
                                                    className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600"
                                                    disabled={loading}
                                                    onClick={handleBatchUpload}
                                                >
                                                    {loading ? (
                                                        <div className="flex items-center">
                                                            <RefreshCw size={16} className="mr-2 animate-spin" />
                                                            Uploading... {progress}%
                                                        </div>
                                                    ) : (
                                                        `Upload ${uploadedFiles.length} Files to Collection`
                                                    )}
                                                </Button>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-medium mb-3">Selected Files</h3>
                                            <div className="border rounded-md overflow-hidden">
                                                {uploadedFiles.length === 0 ? (
                                                    <div className="p-4 text-center text-slate-500">
                                                        No files selected
                                                    </div>
                                                ) : (
                                                    <div className="max-h-96 overflow-y-auto">
                                                        {uploadedFiles.map((file, index) => (
                                                            <div
                                                                key={`${file.name}-${index}`}
                                                                className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 last:border-b-0"
                                                            >
                                                                <div className="flex items-center">
                                                                    <FileText size={16} className="text-slate-500 mr-2" />
                                                                    <div>
                                                                        <p className="text-sm font-medium truncate max-w-xs">{file.name}</p>
                                                                        <p className="text-xs text-slate-500">
                                                                            {(file.size / 1024).toFixed(1)} KB
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => removeFile(index)}
                                                                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            {/* Image preview dialog */}
            <Dialog>
                <DialogTrigger asChild>
                    {/* This is hidden, we'll trigger it programmatically */}
                    <button className="hidden" id="image-preview-trigger">Open</button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Face Image</DialogTitle>
                    </DialogHeader>
                    <div className="aspect-square relative bg-slate-50 dark:bg-slate-800 rounded-md overflow-hidden">
                        <img
                            id="preview-image"
                            src=""
                            alt="Face Preview"
                            className="w-full h-full object-contain"
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminPanel;