import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Plus, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import CameraCapture from '@/components/capture/CameraCapture';
import { Progress } from '@/components/ui/progress';

interface Collection {
    id: string;
    faceCount?: number;
}

interface Face {
    FaceId: string;
    ExternalImageId?: string;
    ImageId?: string;
    Confidence?: number;
}

const AdminPanel = () => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
    const [faces, setFaces] = useState<Face[]>([]);
    const [newCollectionId, setNewCollectionId] = useState('');
    const [newCollectionFolder, setNewCollectionFolder] = useState('');
    const [loading, setLoading] = useState(false);
    const [captureImage, setCaptureImage] = useState<string | null>(null);
    const [externalImageId, setExternalImageId] = useState('');
    const [progress, setProgress] = useState(0);
    const [activeTab, setActiveTab] = useState('collections');

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
            const collectionsList = data.collections.map((id: string) => ({ id }));
            setCollections(collectionsList);

            if (collectionsList.length > 0 && !selectedCollection) {
                setSelectedCollection(collectionsList[0].id);
            }
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
                    folderPath: newCollectionFolder || undefined
                }),
            });

            setProgress(50);

            if (!response.ok) {
                throw new Error('Failed to create collection');
            }

            setProgress(100);
            toast.success(`Collection "${newCollectionId}" created successfully`);
            setNewCollectionId('');
            setNewCollectionFolder('');
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
            setFaces(data.faces || []);
            setProgress(100);
        } catch (error) {
            console.error('Error fetching faces:', error);
            toast.error('Failed to fetch faces');
        } finally {
            setLoading(false);
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

            const response = await fetch(`/api/collections/${selectedCollection}/faces`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': getAuthHeader(),
                },
                body: JSON.stringify({
                    image: captureImage,
                    externalImageId: sanitizedId,
                    additionalInfo: additionalInfo
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

            setProgress(100);
            toast.success('Face removed successfully');
            fetchFaces(selectedCollection);
        } catch (error) {
            console.error('Error deleting face:', error);
            toast.error('Failed to delete face');
        } finally {
            setLoading(false);
        }
    };

    // Update selected collection and fetch faces when changed
    useEffect(() => {
        if (selectedCollection) {
            fetchFaces(selectedCollection);
            setActiveTab('faces');
        }
    }, [selectedCollection]);

    // Handle tab changes
    const handleTabChange = (value: string) => {
        setActiveTab(value);
    };

    // Parse external image ID to get name
    const parseExternalId = (externalId?: string) => {
        if (!externalId) return 'Unnamed Face';

        try {
            const data = JSON.parse(externalId);
            return data.name || 'Unnamed Face';
        } catch {
            return externalId;
        }
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
                        </TabsList>

                        <TabsContent value="collections">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="new-collection" className="text-sm font-medium">Create New Collection</label>
                                        <Input
                                            id="new-collection"
                                            value={newCollectionId}
                                            onChange={(e) => setNewCollectionId(e.target.value)}
                                            placeholder="Collection ID (e.g., employees-collection)"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="collection-folder" className="text-sm font-medium">Associated Folder (Optional)</label>
                                        <Input
                                            id="collection-folder"
                                            value={newCollectionFolder}
                                            onChange={(e) => setNewCollectionFolder(e.target.value)}
                                            placeholder="Folder path (e.g., Employees/Engineering)"
                                        />
                                        <p className="text-xs text-slate-500">
                                            This helps map collections to folders in the search interface
                                        </p>
                                    </div>

                                    <Button
                                        onClick={createCollection}
                                        className="bg-primary hover:bg-primary/90 "
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
                                                        {collection.faceCount !== undefined && (
                                                            <div className="text-sm text-slate-500">{collection.faceCount} faces</div>
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
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {faces.map((face) => (
                                                <Card key={face.FaceId} className="overflow-hidden">
                                                    <CardContent className="p-4">
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <div className="font-medium truncate">
                                                                    {parseExternalId(face.ExternalImageId)}
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
                                                    </CardContent>
                                                </Card>
                                            ))}
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
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminPanel;