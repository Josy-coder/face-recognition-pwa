import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/layout/layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
    RefreshCw,
    PlusCircle,
    Trash2,
    ChevronRight,
    Edit,
    Save,
    Map,
    MoveUp,
    ArrowLeft,
    ChevronDown
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { DragDropContext } from 'react-beautiful-dnd';

// Interfaces
interface LocationNode {
    id: string;
    name: string;
    code: string;
    type: string;
    path: string;
    parentId: string | null;
    level: number;
    order: number;
    children: LocationNode[];
}

interface AddNodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (name: string, code: string, type: string) => Promise<void>;
    parentNode: LocationNode | null;
    availableTypes: { value: string; label: string; }[];
    currentRegion: string;
}

interface EditNodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onEdit: (name: string, code: string) => Promise<void>;
    node: LocationNode | null;
}

interface DeleteNodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onDelete: () => Promise<void>;
    node: LocationNode | null;
}

interface MoveNodeDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onMove: (targetParentId: string) => Promise<void>;
    node: LocationNode | null;
    availableParents: LocationNode[];
}

// AddNodeDialog Component
const AddNodeDialog = ({ isOpen, onClose, onAdd, parentNode, availableTypes, currentRegion }: AddNodeDialogProps) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [type, setType] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleAdd = async () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        if (!type) {
            toast.error('Type is required');
            return;
        }

        setIsSaving(true);
        try {
            await onAdd(name.trim(), code.trim(), type);
            setName('');
            setCode('');
            setType('');
            onClose();
        } catch (error) {
            console.error('Error adding node:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 text-black dark:text-white">
                <DialogHeader>
                    <DialogTitle>
                        Add {parentNode ? 'Child Node' : 'Top Level Node'}
                    </DialogTitle>
                    <DialogDescription>
                        {parentNode
                            ? `Create a new node under ${parentNode.name}`
                            : `Create a new top level node for ${currentRegion}`
                        }
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="node-name">Name</Label>
                        <Input
                            id="node-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter node name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="node-code">Code/ID</Label>
                        <Input
                            id="node-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter node code or ID"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="node-type">Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="node-type">
                                <SelectValue placeholder="Select node type" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableTypes.map(type => (
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
                                {parentNode ? parentNode.name : currentRegion + ' (Root)'}
                            </p>
                            {parentNode && (
                                <p className="text-xs text-slate-500 mt-1">
                                    Path: {parentNode.path}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleAdd}
                        disabled={isSaving || !name.trim() || !type}
                        className="bg-indigo-600 hover:bg-indigo-700"
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
    );
};

// EditNodeDialog Component
const EditNodeDialog = ({ isOpen, onClose, onEdit, node }: EditNodeDialogProps) => {
    const [name, setName] = useState('');
    const [code, setCode] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (node) {
            setName(node.name);
            setCode(node.code || '');
        }
    }, [node]);

    const handleEdit = async () => {
        if (!name.trim()) {
            toast.error('Name is required');
            return;
        }

        setIsSaving(true);
        try {
            await onEdit(name.trim(), code.trim());
            onClose();
        } catch (error) {
            console.error('Error editing node:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 text-black dark:text-white">
                <DialogHeader>
                    <DialogTitle>Edit Node</DialogTitle>
                    <DialogDescription>
                        Update node details
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="edit-node-name">Name</Label>
                        <Input
                            id="edit-node-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Enter node name"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-node-code">Code/ID</Label>
                        <Input
                            id="edit-node-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="Enter node code or ID"
                        />
                    </div>

                    {node && (
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <div className="p-2 border rounded-md bg-slate-50">
                                <p className="text-sm">
                                    {node.type}
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
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleEdit}
                        disabled={isSaving || !name.trim()}
                        className="bg-indigo-600 hover:bg-indigo-700"
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
    );
};

// Delete Node Dialog Component
const DeleteNodeDialog = ({ isOpen, onClose, onDelete, node }: DeleteNodeDialogProps) => {
    const [isSaving, setIsSaving] = useState(false);

    const handleDelete = async () => {
        setIsSaving(true);
        try {
            await onDelete();
            onClose();
        } catch (error) {
            console.error('Error deleting node:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Delete Node</DialogTitle>
                    <DialogDescription>
                        Are you sure you want to delete this node?
                    </DialogDescription>
                </DialogHeader>

                {node && node.children.length > 0 && (
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
                                    Deleting this node will also delete all of its children ({node.children.length} node{node.children.length !== 1 ? 's' : ''}).
                                    This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={handleDelete}
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
    );
};

// Move Node Dialog Component
const MoveNodeDialog = ({ isOpen, onClose, onMove, node, availableParents }: MoveNodeDialogProps) => {
    const [selectedParentId, setSelectedParentId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleMove = async () => {
        if (!selectedParentId) {
            toast.error('Please select a new parent node');
            return;
        }

        setIsSaving(true);
        try {
            await onMove(selectedParentId);
            onClose();
        } catch (error) {
            console.error('Error moving node:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-white dark:bg-slate-800 text-black dark:text-white">
                <DialogHeader>
                    <DialogTitle>Move Node</DialogTitle>
                    <DialogDescription>
                        Select a new parent node
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {node && (
                        <div className="space-y-2">
                            <Label>Current Node</Label>
                            <div className="p-2 border rounded-md bg-slate-50">
                                <p className="text-sm font-medium">{node.name}</p>
                                <p className="text-xs text-slate-500">Current path: {node.path}</p>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label>New Parent</Label>
                        <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select new parent node" />
                            </SelectTrigger>
                            <SelectContent>
                                {availableParents.map(parent => (
                                    <SelectItem key={parent.id} value={parent.id}>
                                        {parent.name} ({parent.path})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedParentId && (
                        <div className="space-y-2">
                            <Label>Preview</Label>
                            <div className="p-2 border rounded-md bg-slate-50">
                                <p className="text-xs text-slate-500">New path will be:</p>
                                <p className="text-sm">
                                    {availableParents.find(p => p.id === selectedParentId)?.path}/{node?.name}
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>

                    <Button
                        onClick={handleMove}
                        disabled={isSaving || !selectedParentId}
                        className="bg-indigo-600 hover:bg-indigo-700"
                    >
                        {isSaving ? (
                            <>
                                <RefreshCw size={16} className="mr-2 animate-spin" />
                                Moving...
                            </>
                        ) : (
                            <>
                                <MoveUp size={16} className="mr-2" />
                                Move Node
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Main GeoManagementPage Component
export default function GeoManagementPage() {
    const router = useRouter();
    const [activeTab, setActiveTab] = useState('PNG');
    const [isLoading, setIsLoading] = useState(true);
    const [locations, setLocations] = useState<LocationNode[]>([]);
    const [currentNode, setCurrentNode] = useState<LocationNode | null>(null);
    const [showAddDialog, setShowAddDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [showMoveDialog, setShowMoveDialog] = useState(false);
    const [availableParents, setAvailableParents] = useState<LocationNode[]>([]);
    const [currentLevel, setCurrentLevel] = useState(0);
    const [currentPath, setCurrentPath] = useState<string[]>([]);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const { isAdminLoggedIn, checkAuthStatus } = useAuthStore();

    // Check admin authentication on mount
    useEffect(() => {
        const verifyAuth = async () => {
            if (!isAdminLoggedIn) {
                await checkAuthStatus();
            }

            if (!isAdminLoggedIn) {
                toast.error('Admin access required');
                router.push('/admin/login');
                return;
            }

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
                    toast.error('Admin access required');
                    router.push('/admin/login');
                    return;
                }
                throw new Error('Failed to fetch geographical data');
            }

            const data = await response.json();
            setLocations(data.locations || []);
            setActiveTab('PNG');
        } catch (error) {
            console.error('Error fetching geo data:', error);
            toast.error('Failed to load geographical data');
        } finally {
            setIsLoading(false);
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

    // Node operations
    const handleAddNode = async (name: string, code: string, type: string) => {
        try {
            const response = await fetch('/api/admin/geo/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    code,
                    type,
                    parentId: currentNode?.id || null,
                    region: activeTab
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to add node');
            }

            toast.success('Node added successfully');
            fetchGeoData();
        } catch (error) {
            console.error('Error adding node:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to add node');
            throw error;
        }
    };

    const handleEditNode = async (name: string, code: string) => {
        if (!currentNode) return;

        try {
            const response = await fetch('/api/admin/geo/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentNode.id,
                    name,
                    code
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to update node');
            }

            toast.success('Node updated successfully');
            fetchGeoData();
        } catch (error) {
            console.error('Error updating node:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to update node');
            throw error;
        }
    };

    const handleDeleteNode = async () => {
        if (!currentNode) return;

        try {
            const response = await fetch('/api/admin/geo/delete', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: currentNode.id
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to delete node');
            }

            toast.success('Node deleted successfully');
            setCurrentNode(null);
            setCurrentPath([]);
            fetchGeoData();
        } catch (error) {
            console.error('Error deleting node:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to delete node');
            throw error;
        }
    };

    const handleMoveNode = async (newParentId: string) => {
        if (!currentNode) return;

        try {
            const response = await fetch('/api/admin/geo/move', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodeId: currentNode.id,
                    newParentId
                })
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to move node');
            }

            toast.success('Node moved successfully');
            fetchGeoData();
        } catch (error) {
            console.error('Error moving node:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to move node');
            throw error;
        }
    };

    // Handle node reordering
    const handleDragEnd = async (result: any) => {
        if (!result.destination) return;

        const sourceIndex = result.source.index;
        const destinationIndex = result.destination.index;

        if (sourceIndex === destinationIndex) return;

        try {
            const response = await fetch('/api/admin/geo/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodeId: result.draggableId,
                    newOrder: destinationIndex
                })
            });

            if (!response.ok) throw new Error('Failed to reorder node');

            fetchGeoData();
            toast.success('Node order updated');
        } catch (error) {
            console.error('Error reordering node:', error);
            toast.error('Failed to update node order');
        }
    };

    // Navigation and UI helpers
    const toggleNodeExpansion = (nodeId: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(nodeId)) {
                next.delete(nodeId);
            } else {
                next.add(nodeId);
            }
            return next;
        });
    };

    const navigateToNode = (node: LocationNode) => {
        setCurrentNode(node);
        const pathParts = node.path.split('/');
        setCurrentPath(pathParts);
        setCurrentLevel(node.level);
    };

    const prepareAddNode = (node: LocationNode | null) => {
        setCurrentNode(node);
        if (node) {
            setCurrentLevel(node.level + 1);
        } else {
            setCurrentLevel(0);
        }
        setShowAddDialog(true);
    };

    const prepareMoveNode = (node: LocationNode) => {
        setCurrentNode(node);
        // Find available parents based on node type and hierarchy rules
        const availableParents = findAvailableParents(node);
        setAvailableParents(availableParents);
        setShowMoveDialog(true);
    };

    // Find available parents for a node
    const findAvailableParents = (node: LocationNode): LocationNode[] => {
        const getAllNodes = (nodes: LocationNode[]): LocationNode[] => {
            return nodes.reduce((acc, curr) => {
                return [...acc, curr, ...getAllNodes(curr.children)];
            }, [] as LocationNode[]);
        };

        const allNodes = getAllNodes(locations);

        // Filter out invalid parents
        return allNodes.filter(potential => {
            // Cannot move to self or descendant
            if (potential.id === node.id || potential.path.startsWith(node.path + '/')) {
                return false;
            }

            // Check hierarchy rules
            switch (activeTab) {
                case 'PNG':
                    if (node.type === 'province') return potential.type === 'region';
                    if (node.type === 'district') return potential.type === 'province';
                    if (node.type === 'llg') return potential.type === 'district';
                    if (node.type === 'ward') return potential.type === 'llg';
                    return false;
                case 'ABG':
                    if (node.type === 'region') return potential.type === 'region';
                    if (node.type === 'district') return potential.type === 'region';
                    if (node.type === 'constituency') return potential.type === 'district';
                    return false;
                case 'MKA':
                    if (node.type === 'region') return potential.type === 'region';
                    if (node.type === 'ward') return potential.type === 'region';
                    return false;
                default:
                    return false;
            }
        });
    };

    // Render functions
    const renderNodeTree = (node: LocationNode, level: number = 0) => {
        const isExpanded = expandedNodes.has(node.id);
        const hasChildren = node.children.length > 0;

        return (
            <div key={node.id} className="select-none">
                <div
                    className={`
                        flex items-center gap-2 p-2 rounded-md
                        ${currentNode?.id === node.id ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'}
                        transition-colors
                        cursor-pointer
                        ${level > 0 ? 'ml-6' : ''}
                    `}
                >
                    {hasChildren && (
                        <button
                            onClick={() => toggleNodeExpansion(node.id)}
                            className="text-slate-400 hover:text-slate-600"
                        >
                            {isExpanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </button>
                    )}

                    <div
                        className="flex-1 flex items-center gap-2"
                        onClick={() => navigateToNode(node)}
                    >
                        <span className="font-medium">{node.name}</span>
                        {node.code && (
                            <span className="text-xs text-slate-500">({node.code})</span>
                        )}
                        <span className="text-xs text-slate-400">{node.type}</span>
                    </div>

                    <div className="flex items-center space-x-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                prepareMoveNode(node);
                            }}
                            className="h-8 w-8 p-0"
                        >
                            <MoveUp size={14} className="text-slate-500" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentNode(node);
                                setShowEditDialog(true);
                            }}
                            className="h-8 w-8 p-0"
                        >
                            <Edit size={14} className="text-slate-500" />
                        </Button>

                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                setCurrentNode(node);
                                setShowDeleteDialog(true);
                            }}
                            className="h-8 w-8 p-0"
                        >
                            <Trash2 size={14} className="text-red-500" />
                        </Button>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div className="pl-4">
                        {node.children.map(child => renderNodeTree(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            <Head>
                <title>Geographic Management - Admin Panel</title>
                <meta name="description" content="Manage geographic data structure" />
            </Head>

            <Layout title="Geographic Structure Management" showHistory={false} showNewSearch={true}>
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center mb-6">
                        <Button
                            variant="ghost"
                            onClick={() => router.push('/admin')}
                            className="flex items-center"
                        >
                            <ArrowLeft size={16} className="mr-2" />
                            Back to Admin Panel
                        </Button>
                    </div>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                            {/* Navigation Panel */}
                            <div className="md:col-span-5">
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center">
                                            <Map className="h-5 w-5 mr-2" />
                                            Geographic Structure
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Tabs
                                            value={activeTab}
                                            onValueChange={(value) => {
                                                setActiveTab(value);
                                                setCurrentNode(null);
                                                setCurrentPath([]);
                                                setCurrentLevel(0);
                                            }}
                                        >
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
                                                            onClick={() => prepareAddNode(null)}
                                                            className="text-indigo-600"
                                                        >
                                                            <PlusCircle size={16} className="mr-2" />
                                                            Add Root Node
                                                        </Button>
                                                    </div>
                                                    {locations
                                                        .filter(node => node.name === 'PNG')
                                                        .map(node => renderNodeTree(node))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="ABG">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-sm font-medium">ABG Structure</h3>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => prepareAddNode(null)}
                                                            className="text-indigo-600"
                                                        >
                                                            <PlusCircle size={16} className="mr-2" />
                                                            Add Root Node
                                                        </Button>
                                                    </div>
                                                    {locations
                                                        .filter(node => node.name === 'ABG')
                                                        .map(node => renderNodeTree(node))}
                                                </div>
                                            </TabsContent>

                                            <TabsContent value="MKA">
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="text-sm font-medium">MKA Structure</h3>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => prepareAddNode(null)}
                                                            className="text-indigo-600"
                                                        >
                                                            <PlusCircle size={16} className="mr-2" />
                                                            Add Root Node
                                                        </Button>
                                                    </div>
                                                    {locations
                                                        .filter(node => node.name === 'MKA')
                                                        .map(node => renderNodeTree(node))}
                                                </div>
                                            </TabsContent>
                                        </Tabs>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Details Panel */}
                            <div className="md:col-span-7">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>
                                            {currentNode ? (
                                                <>
                                                    Node Details: {currentNode.name}
                                                    <span className="text-sm text-slate-500 ml-2">
                                                        ({currentNode.type})
                                                    </span>
                                                </>
                                            ) : (
                                                'Select a node to view details'
                                            )}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {currentNode ? (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <Label>Name</Label>
                                                        <p className="mt-1">{currentNode.name}</p>
                                                    </div>
                                                    <div>
                                                        <Label>Code</Label>
                                                        <p className="mt-1">{currentNode.code || '-'}</p>
                                                    </div>
                                                    <div>
                                                        <Label>Type</Label>
                                                        <p className="mt-1">{currentNode.type}</p>
                                                    </div>
                                                    <div>
                                                        <Label>Level</Label>
                                                        <p className="mt-1">{currentNode.level}</p>
                                                    </div>
                                                </div>

                                                <div>
                                                    <Label>Path</Label>
                                                    <p className="mt-1 text-sm text-slate-600">
                                                        {currentNode.path}
                                                    </p>
                                                </div>

                                                <div>
                                                    <Label>Children</Label>
                                                    {currentNode.children.length > 0 ? (
                                                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                            {currentNode.children.map(child => (
                                                                <div
                                                                    key={child.id}
                                                                    className="p-2 bg-slate-50 rounded-md"
                                                                >
                                                                    <p className="font-medium">{child.name}</p>
                                                                    <p className="text-xs text-slate-500">
                                                                        {child.type}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="mt-1 text-sm text-slate-500">
                                                            No children
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="ghost"
                                                        className="border-gray"
                                                        onClick={() => prepareAddNode(currentNode)}
                                                    >
                                                        <PlusCircle size={16} className="mr-2" />
                                                        Add Child
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="border-gray"
                                                        onClick={() => prepareMoveNode(currentNode)}
                                                    >
                                                        <MoveUp size={16} className="mr-2" />
                                                        Move
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        className="bg-amber-500 text-black dark:text-white"
                                                        onClick={() => setShowEditDialog(true)}
                                                    >
                                                        <Edit size={16} className="mr-2" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        variant="destructive"
                                                        onClick={() => setShowDeleteDialog(true)}
                                                    >
                                                        <Trash2 size={16} className="mr-2" />
                                                        Delete
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8 text-slate-500">
                                                Select a node from the navigation panel to view and manage its details
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </DragDropContext>

                    {/* Dialogs */}
                    <AddNodeDialog
                        isOpen={showAddDialog}
                        onClose={() => setShowAddDialog(false)}
                        onAdd={handleAddNode}
                        parentNode={currentNode}
                        availableTypes={getAvailableNodeTypes()}
                        currentRegion={activeTab}
                    />

                    <EditNodeDialog
                        isOpen={showEditDialog}
                        onClose={() => setShowEditDialog(false)}
                        onEdit={handleEditNode}
                        node={currentNode}
                    />

                    <DeleteNodeDialog
                        isOpen={showDeleteDialog}
                        onClose={() => setShowDeleteDialog(false)}
                        onDelete={handleDeleteNode}
                        node={currentNode}
                    />

                    <MoveNodeDialog
                        isOpen={showMoveDialog}
                        onClose={() => setShowMoveDialog(false)}
                        onMove={handleMoveNode}
                        node={currentNode}
                        availableParents={availableParents}
                    />
                </div>
            </Layout>
        </>
    );
}