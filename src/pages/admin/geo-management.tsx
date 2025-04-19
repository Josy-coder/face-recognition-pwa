import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { RefreshCw, PlusCircle, Trash2, ChevronRight, Edit, Save, Map } from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

// Interface for LocationNode from the API
interface LocationNode {
    id: string;
    name: string;
    type: string;
    path: string;
    parentId: string | null;
    level: number;
    children: LocationNode[];
}

export default function GeoManagementPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('PNG');
    const [isLoading, setIsLoading] = useState(true);
    const [locations, setLocations] = useState<LocationNode[]>([]);
    const [currentNode, setCurrentNode] = useState<LocationNode | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [newNodeName, setNewNodeName] = useState('');
    const [newNodeType, setNewNodeType] = useState('');
    const [editNodeName, setEditNodeName] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentPath, setCurrentPath] = useState<string[]>([]);

    // Get auth state from Zustand store
    const { isAdminLoggedIn, checkAuthStatus } = useAuthStore();

    // Check admin authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            if (!isAdminLoggedIn) {
                await checkAuthStatus();
            }

            if (!isAdminLoggedIn) {
                // Not an admin, redirect to login
                toast.error('Admin access required');
                router.push('/admin/login');
                return;
            }

            // Load geo data
            fetchGeoData();
        };

        verifyAuth();
    }, [isAdminLoggedIn, checkAuthStatus, router]);

    // Fetch geographical data
    const fetchGeoData = async () => {
        setIsLoading(true);

        try {
            const response = await fetch('/api/geo/all-locations');

            if (!response.ok) {
                if (response.status === 401) {
                    // Unauthorized - redirect to admin login
                    toast.error('Admin access required');
                    router.push('/admin/login');
                    return;
                }

                throw new Error('Failed to fetch geographical data');
            }

            const data = await response.json();

            // Set the locations data
            setLocations(data.locations || []);

            // Default to PNG tab
            setActiveTab('PNG');

        } catch (error) {
            console.error('Error fetching geo data:', error);
            toast.error('Failed to load geographical data');
        } finally {
            setIsLoading(false);
        }
    };

    // Get the current region data based on active tab
    const getCurrentRegionData = (): LocationNode | null => {
        return locations.find(loc => loc.name === activeTab) || null;
    };

    // Get children of the current node or root level nodes for the active region
    const getCurrentChildren = (): LocationNode[] => {
        if (currentNode) {
            return currentNode.children || [];
        }

        const regionNode = getCurrentRegionData();
        return regionNode ? regionNode.children : [];
    };

    // Handle adding a new node
    const handleAddNode = async () => {
        if (!newNodeName.trim()) {
            toast.error('Name is required');
            return;
        }

        if (!newNodeType) {
            toast.error('Type is required');
            return;
        }

        setIsSaving(true);

        try {
            // Determine parent ID and path
            let parentId = null;
            let parentPath = '';

            if (currentNode) {
                parentId = currentNode.id;
                parentPath = currentNode.path;
            } else {
                // Root level node for the active tab
                const regionNode = getCurrentRegionData();
                if (regionNode) {
                    parentId = regionNode.id;
                    parentPath = regionNode.path;
                }
            }

            const response = await fetch('/api/admin/geo/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: newNodeName.trim(),
                    type: newNodeType,
                    parentId: parentId,
                    parentPath: parentPath,
                    region: activeTab
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to add node');
            }

            toast.success('Node added successfully');
            setShowAddDialog(false);
            setNewNodeName('');
            setNewNodeType('');

            // Refresh data
            fetchGeoData();

        } catch (error) {
            console.error('Error adding node:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while adding node');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle editing a node
    const handleEditNode = async () => {
        if (!currentNode) return;

        if (!editNodeName.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);

        try {
            const response = await fetch('/api/admin/geo/update', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: currentNode.id,
                    name: editNodeName.trim()
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update node');
            }

            toast.success('Node updated successfully');
            setShowEditDialog(false);
            setEditNodeName('');

            // Refresh data
            fetchGeoData();

        } catch (error) {
            console.error('Error updating node:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while updating node');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle deleting a node
    const handleDeleteNode = async () => {
        if (!currentNode) return;

        setIsSaving(true);

        try {
            const response = await fetch('/api/admin/geo/delete', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    id: currentNode.id
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete node');
            }

            toast.success('Node deleted successfully');
            setShowDeleteDialog(false);

            // Reset current node
            setCurrentNode(null);
            setCurrentPath([]);

            // Refresh data
            fetchGeoData();

        } catch (error) {
            console.error('Error deleting node:', error);
            toast.error(error instanceof Error ? error.message : 'An error occurred while deleting node');
        } finally {
            setIsSaving(false);
        }
    };

    // Get available node types based on current level and active tab
    const getAvailableNodeTypes = () => {
        switch (activeTab) {
            case 'PNG':
                switch (currentLevel) {
                    case 0: return [{ value: 'province', label: 'Province' }];
                    case 1: return [{ value: 'district', label: 'District' }];
                    case 2: return [{ value: 'llg', label: 'LLG' }];
                    case 3: return [{ value: 'ward', label: 'Ward' }];
                    case 4: return [{ value: 'village', label: 'Village' }];
                    default: return [];
                }
            case 'ABG':
                switch (currentLevel) {
                    case 0: return [{ value: 'region', label: 'Region' }];
                    case 1: return [{ value: 'district', label: 'District' }];
                    case 2: return [{ value: 'constituency', label: 'Constituency' }];
                    case 3: return [{ value: 'village', label: 'Village' }];
                    default: return [];
                }
            case 'MKA':
                switch (currentLevel) {
                    case 0: return [{ value: 'region', label: 'Region' }];
                    case 1: return [{ value: 'ward', label: 'Ward' }];
                    case 2: return [{ value: 'section', label: 'Section/Village' }];
                    default: return [];
                }
            default:
                return [];
        }
    };

    // Get node type display name
    const getNodeTypeDisplay = (type: string): string => {
        const typeMap: Record<string, string> = {
            'province': 'Province',
            'district': 'District',
            'llg': 'LLG',
            'ward': 'Ward',
            'village': 'Village',
            'region': 'Region',
            'constituency': 'Constituency',
            'section': 'Section/Village',
        };

        return typeMap[type] || type;
    };

    // Navigate to a specific node using its path
    const navigateToNode = (node: LocationNode) => {
        setCurrentNode(node);
        const pathParts = node.path.split('/');
        setCurrentPath(pathParts);
        setCurrentLevel(node.level);
    };

    // Navigate to a specific path
    const navigateToPath = (path: string[]) => {
        if (path.length === 0) {
            // Root level
            setCurrentNode(null);
            setCurrentPath([]);
            setCurrentLevel(0);
            return;
        }

        // Find the node with this path
        const pathString = path.join('/');
        const findNode = (nodes: LocationNode[]): LocationNode | null => {
            for (const node of nodes) {
                if (node.path === pathString) {
                    return node;
                }

                const foundInChildren = findNode(node.children);
                if (foundInChildren) {
                    return foundInChildren;
                }
            }
            return null;
        };

        const regionNode = locations.find(loc => loc.name === activeTab);
        if (!regionNode) return;

        const targetNode = findNode([regionNode]);
        if (targetNode) {
            setCurrentNode(targetNode);
            setCurrentLevel(targetNode.level);
        } else {
            // If node not found, reset to root
            setCurrentNode(null);
            setCurrentLevel(0);
        }

        setCurrentPath(path);
    };

    // Prepare to add a new node
    const prepareAddNode = (node: LocationNode | null) => {
        setCurrentNode(node);

        if (node) {
            setCurrentLevel(node.level + 1);
        } else {
            const regionNode = getCurrentRegionData();
            setCurrentLevel(regionNode ? 1 : 0);
        }

        setNewNodeName('');
        setNewNodeType('');
        setShowAddDialog(true);
    };

    // Prepare to edit a node
    const prepareEditNode = (node: LocationNode) => {
        setCurrentNode(node);
        setEditNodeName(node.name);
        setShowEditDialog(true);
    };

    // Prepare to delete a node
    const prepareDeleteNode = (node: LocationNode) => {
        setCurrentNode(node);
        setShowDeleteDialog(true);
    };

    // Render node tree recursively
    const renderNodeTree = (node: LocationNode, isExpanded: boolean = false) => {
        // Check if this node is in the current path
        const isInPath = currentPath.includes(node.name);
        const isCurrentNode = currentNode?.id === node.id;

        return (
            <div key={node.id} className="space-y-1">
                <div
                    className={`flex items-center p-2 rounded-md ${isCurrentNode ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}`}
                >
                    <div
                        className="flex-1 flex items-center cursor-pointer"
                        onClick={() => navigateToNode(node)}
                    >
                        <ChevronRight size={16} className="text-slate-400 mr-2" />
                        <span className="font-medium">{node.name}</span>
                        <span className="ml-2 text-xs text-slate-500">{getNodeTypeDisplay(node.type)}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                prepareEditNode(node);
                            }}
                        >
                            <Edit size={14} />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-red-500"
                            onClick={(e) => {
                                e.stopPropagation();
                                prepareDeleteNode(node);
                            }}
                        >
                            <Trash2 size={14} />
                        </Button>
                    </div>
                </div>

                {(isExpanded || isInPath) && node.children.length > 0 && (
                    <div className="pl-6">
                        {node.children.map(child => renderNodeTree(child, isInPath))}
                    </div>
                )}
            </div>
        );
    };

    // Render region tree (top level)
    const renderRegionTree = (regionName: string) => {
        const region = locations.find(loc => loc.name === regionName);
        if (!region) {
            return (
                <div className="text-center p-4 text-sm text-slate-500">
                    No data for {regionName} found.
                </div>
            );
        }

        if (region.children.length === 0) {
            return (
                <div className="text-center p-4 text-sm text-slate-500">
                    No nodes defined for {regionName} yet.
                </div>
            );
        }

        return (
            <div className="space-y-2">
                {region.children.map(node => renderNodeTree(node))}
            </div>
        );
    };

    if (isLoading) {
        return (
            <Layout title="Geographic Structure Management" showHistory={false} showNewSearch={true}>
            <div className="flex justify-center items-center min-h-screen">
                <RefreshCw className="animate-spin h-8 w-8 text-indigo-600" />
            </div>
            </Layout>
        );
    }

    return (
        <>
            <Head>
                <title>Geographic Management - Admin Panel</title>
                <meta name="description" content="Manage geographic data for PNG Pess Book" />
            </Head>
            <Layout title="Geographic Structure Management" showHistory={false} showNewSearch={true}>
            <div className="max-w-7xl">
                <div className="flex justify-between items-center mb-6">

                    <Button
                        variant="ghost"
                        onClick={() => router.push('/admin')}
                        className="flex border-gray items-center"
                    >
                        Back to Admin Panel
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    <div className="md:col-span-5">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <Map className="h-5 w-5 mr-2" />
                                    Navigation
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={activeTab} onValueChange={(val) => {
                                    setActiveTab(val);
                                    setCurrentNode(null);
                                    setCurrentPath([]);
                                    setCurrentLevel(0);
                                }}>
                                    <TabsList className="grid grid-cols-3 mb-4">
                                        <TabsTrigger value="PNG">PNG</TabsTrigger>
                                        <TabsTrigger value="ABG">ABG</TabsTrigger>
                                        <TabsTrigger value="MKA">MKA</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="PNG">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium">PNG Structure</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-indigo-600"
                                                    onClick={() => prepareAddNode(null)}
                                                >
                                                    <PlusCircle size={16} />
                                                </Button>
                                            </div>

                                            {renderRegionTree('PNG')}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="ABG">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium">ABG Structure</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-indigo-600"
                                                    onClick={() => prepareAddNode(null)}
                                                >
                                                    <PlusCircle size={16} />
                                                </Button>
                                            </div>

                                            {renderRegionTree('ABG')}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="MKA">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-medium">MKA Structure</h3>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-indigo-600"
                                                    onClick={() => prepareAddNode(null)}
                                                >
                                                    <PlusCircle size={16} />
                                                </Button>
                                            </div>

                                            {renderRegionTree('MKA')}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="md:col-span-7">
                        <Card>
                            <CardHeader>
                                <CardTitle>
                                    {activeTab} {currentPath.length > 0 ? ' > ' + currentPath.join(' > ') : ''}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {/* Breadcrumb navigation */}
                                    <div className="flex items-center flex-wrap space-x-2 text-sm">
                                        <button
                                            onClick={() => navigateToPath([])}
                                            className="text-indigo-600 hover:underline"
                                        >
                                            {activeTab}
                                        </button>

                                        {currentPath.slice(1).map((part, index) => (
                                            <div key={index} className="flex items-center space-x-2">
                                                <span className="text-slate-400">/</span>
                                                <button
                                                    onClick={() => navigateToPath(currentPath.slice(0, index + 2))}
                                                    className="text-indigo-600 hover:underline"
                                                >
                                                    {part}
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Current node details */}
                                    {currentNode ? (
                                        <div className="bg-slate-50 p-4 rounded-md">
                                            <h3 className="font-medium mb-2">Details</h3>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-sm text-slate-500">Name</p>
                                                    <p>{currentNode.name}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Type</p>
                                                    <p>{getNodeTypeDisplay(currentNode.type)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">ID</p>
                                                    <p className="text-sm">{currentNode.id}</p>
                                                </div>
                                                <div>
                                                    <p className="text-sm text-slate-500">Level</p>
                                                    <p className="text-sm">{currentNode.level}</p>
                                                </div>
                                                <div className="md:col-span-2">
                                                    <p className="text-sm text-slate-500">Path</p>
                                                    <p className="text-sm truncate">{currentNode.path}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-slate-50 p-4 rounded-md">
                                            <h3 className="font-medium mb-2">{activeTab} Root</h3>
                                            <p className="text-sm text-slate-500">
                                                Select a node from the navigation panel or create a new top-level node.
                                            </p>
                                        </div>
                                    )}

                                    {/* Children section */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-medium">
                                                {currentNode ? 'Child Nodes' : 'Top Level Nodes'}
                                            </h3>
                                            <Button
                                                onClick={() => prepareAddNode(currentNode)}
                                                className="flex items-center bg-indigo-600 hover:bg-indigo-700"
                                            >
                                                <PlusCircle size={16} className="mr-2" />
                                                Add {currentNode ? 'Child' : 'Node'}
                                            </Button>
                                        </div>

                                        {currentNode && currentNode.children.length === 0 ? (
                                            <div className="text-center p-6 bg-slate-50 rounded-md">
                                                <p className="text-slate-500">No child nodes found.</p>
                                                <Button
                                                    variant="ghost"
                                                    className="mt-4 border-gray"
                                                    onClick={() => prepareAddNode(currentNode)}
                                                >
                                                    Add Child Node
                                                </Button>
                                            </div>
                                        ) : currentNode === null && getCurrentChildren().length === 0 ? (
                                            <div className="text-center p-6 bg-slate-50 rounded-md">
                                                <p className="text-slate-500">No nodes defined for {activeTab} yet.</p>
                                                <Button
                                                    variant="outline"
                                                    className="mt-4"
                                                    onClick={() => prepareAddNode(null)}
                                                >
                                                    Add Top Level Node
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {getCurrentChildren().map(node => (
                                                    <Card key={node.id} className="overflow-hidden">
                                                        <CardContent className="p-4">
                                                            <div className="flex justify-between items-start">
                                                                <div>
                                                                    <h4 className="font-medium">{node.name}</h4>
                                                                    <p className="text-xs text-slate-500">{getNodeTypeDisplay(node.type)}</p>
                                                                </div>
                                                                <div className="flex space-x-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-slate-500"
                                                                        onClick={() => prepareEditNode(node)}
                                                                    >
                                                                        <Edit size={14} />
                                                                    </Button>

                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        className="h-8 w-8 p-0 text-red-500"
                                                                        onClick={() => prepareDeleteNode(node)}
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </div>
                                                            </div>

                                                            <div className="mt-4 pt-2 border-t border-slate-100">
                                                                <p className="text-xs text-slate-500">
                                                                    {node.children.length} child {node.children.length === 1 ? 'node' : 'nodes'}
                                                                </p>
                                                            </div>
                                                        </CardContent>
                                                        <CardFooter className="bg-slate-50 p-2 flex justify-end">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-indigo-600"
                                                                onClick={() => navigateToNode(node)}
                                                            >
                                                                View Details
                                                            </Button>
                                                        </CardFooter>
                                                    </Card>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Add Node Dialog */}
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogContent className="bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                    <DialogHeader>
                        <DialogTitle>
                            Add {currentNode ? 'Child Node' : 'Top Level Node'}
                        </DialogTitle>
                        <DialogDescription>
                            {currentNode
                                ? `Create a new node under ${currentNode.name}`
                                : `Create a new top level node for ${activeTab}`
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="node-name">Name</Label>
                            <Input
                                id="node-name"
                                value={newNodeName}
                                onChange={(e) => setNewNodeName(e.target.value)}
                                placeholder="Enter node name"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="node-type">Type</Label>
                            <Select value={newNodeType} onValueChange={setNewNodeType}>
                                <SelectTrigger id="node-type">
                                    <SelectValue placeholder="Select node type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {getAvailableNodeTypes().map(type => (
                                        <SelectItem key={type.value} value={type.value}>
                                            {type.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Parent</Label>
                            <div className="p-2 border rounded-md bg-slate-50">
                                <p className="text-sm">
                                    {currentNode ? currentNode.name : activeTab + ' (Root)'}
                                </p>
                                {currentNode && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Path: {currentNode.path}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            className="border-gray"
                            onClick={() => setShowAddDialog(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleAddNode}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isSaving || !newNodeName.trim() || !newNodeType}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                'Add Node'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Node Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="bg-slate-100 dark:bg-slate-800 text-black dark:text-white">
                    <DialogHeader>
                        <DialogTitle>Edit Node</DialogTitle>
                        <DialogDescription>
                            Update the name of this node
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-node-name">Name</Label>
                            <Input
                                id="edit-node-name"
                                value={editNodeName}
                                onChange={(e) => setEditNodeName(e.target.value)}
                                placeholder="Enter node name"
                            />
                        </div>

                        {currentNode && (
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="p-2 border rounded-md bg-slate-50">
                                    <p className="text-sm">
                                        {getNodeTypeDisplay(currentNode.type)}
                                    </p>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Note: Node type cannot be changed after creation
                                </p>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button
                            variant="ghost"
                            className="border-gray"
                            onClick={() => setShowEditDialog(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            onClick={handleEditNode}
                            className="bg-indigo-600 hover:bg-indigo-700"
                            disabled={isSaving || !editNodeName.trim()}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={16} className="mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Node Dialog */}
            <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Node</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this node?
                        </DialogDescription>
                    </DialogHeader>

                    {currentNode && currentNode.children.length > 0 && (
                        <div className="py-4">
                            <div className="bg-amber-50 px-4 py-3 rounded-md text-amber-800 flex items-start">
                                <div className="mr-2 mt-0.5 text-amber-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                        <line x1="12" y1="9" x2="12" y2="13" />
                                        <line x1="12" y1="17" x2="12.01" y2="17" />
                                    </svg>
                                </div>
                                <div>
                                    <p className="font-medium mb-1">Warning: This node has children</p>
                                    <p className="text-sm">
                                        Deleting this node will also delete all of its children ({currentNode.children.length} node{currentNode.children.length !== 1 ? 's' : ''}).
                                        This action cannot be undone.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(false)}
                        >
                            Cancel
                        </Button>

                        <Button
                            variant="destructive"
                            onClick={handleDeleteNode}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <>
                                    <RefreshCw size={16} className="mr-2 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={16} className="mr-2" />
                                    Delete Node
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </Layout>
        </>
    );
}