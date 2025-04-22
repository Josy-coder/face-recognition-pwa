import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Folder, FolderOpen, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FolderData {
    id: string;
    name: string;
    path: string;
    level: number;
    order: number;
    code?: string;
}

interface FolderSelectorProps {
    onFolderSelect: (folderPaths: string[]) => void;
    initialSelected?: string[];
    minLevel?: number;
    mode?: 'PNG' | 'ABG' | 'MKA';
}

type CheckState = boolean | "indeterminate";
type LoadingState = Record<string, boolean>;
type ExpandedState = Record<string, boolean>;
type NodeState = Record<string, FolderData[]>;

export default function FolderSelector({
                                           onFolderSelect,
                                           initialSelected = [],
                                           minLevel = 2,
                                           mode = 'PNG'
                                       }: FolderSelectorProps) {
    const [loading, setLoading] = useState(true);
    const [loadingNodes, setLoadingNodes] = useState<LoadingState>({});
    const [expandedFolders, setExpandedFolders] = useState<ExpandedState>({});
    const [selectedFolders, setSelectedFolders] = useState<Record<string, CheckState>>({});
    const [selectedPaths, setSelectedPaths] = useState<string[]>(initialSelected);
    const [invalidSelections, setInvalidSelections] = useState<string[]>([]);
    const [nodes, setNodes] = useState<NodeState>({});
    const [error, setError] = useState<string | null>(null);

    // Initialize with root level
    useEffect(() => {
        loadNodesForPath(mode, 'root', null);
    }, [mode]);

    // Function to load nodes for a specific path
    const loadNodesForPath = async (region: string, level: string, parentId: string | null) => {
        const loadingKey = `${region}-${level}-${parentId}`;
        setLoadingNodes(prev => ({ ...prev, [loadingKey]: true }));
        setError(null);

        try {
            let levelParam;
            switch (region) {
                case 'PNG':
                    levelParam = level === 'root' ? 'provinces' :
                        level === 'province' ? 'districts' :
                            level === 'district' ? 'llgs' :
                                level === 'llg' ? 'wards' : 'locations';
                    break;
                case 'ABG':
                    levelParam = level === 'root' ? 'regions' :
                        level === 'region' ? 'districts' :
                            level === 'district' ? 'constituencies' : 'locations';
                    break;
                case 'MKA':
                    levelParam = level === 'root' ? 'regions' :
                        level === 'region' ? 'wards' : 'locations';
                    break;
                default:
                    throw new Error('Invalid region');
            }

            const queryParams = new URLSearchParams();
            if (parentId) queryParams.append('parentId', parentId);

            const response = await fetch(`/api/geo/${region}/${levelParam}?${queryParams.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch nodes');
            }

            const data = await response.json();
            setNodes(prev => ({
                ...prev,
                [loadingKey]: data.nodes
            }));

            // If there are initial selections, expand their parent paths
            if (initialSelected && initialSelected.length > 0) {
                const relevantPaths = initialSelected.filter(path =>
                    path.startsWith(`${region}/`)
                );

                relevantPaths.forEach(path => {
                    const pathParts = path.split('/');
                    let currentPath = '';
                    pathParts.forEach((part, index) => {
                        if (index === 0) {
                            currentPath = part;
                        } else {
                            currentPath += '/' + part;
                            setExpandedFolders(prev => ({
                                ...prev,
                                [currentPath]: true
                            }));
                        }
                    });
                });
            }

        } catch (error) {
            console.error('Error loading nodes:', error);
            setError('Failed to load locations');
            toast.error('Failed to load locations');
        } finally {
            setLoadingNodes(prev => ({ ...prev, [loadingKey]: false }));
            setLoading(false);
        }
    };

    // Check if a folder meets the minimum level requirement
    const folderMeetsMinLevel = (folder: FolderData): boolean => {
        return folder.level >= minLevel;
    };

    // Validate selections against minimum level
    const validateSelections = useCallback((paths: string[]): boolean => {
        const invalid = paths.filter(path => {
            // Find the corresponding folder data
            const allNodes = Object.values(nodes).flat();
            const node = allNodes.find(n => n.path === path);
            return !node || node.level < minLevel;
        });

        setInvalidSelections(invalid);
        return invalid.length === 0;
    }, [nodes, minLevel]);

    // Handle folder expansion
    const toggleExpand = async (folder: FolderData, event: React.MouseEvent) => {
        event.stopPropagation();
        const isExpanded = expandedFolders[folder.path];

        setExpandedFolders(prev => ({
            ...prev,
            [folder.path]: !isExpanded
        }));

        if (!isExpanded && folder.level < 4) {
            // Load child nodes if not already loaded
            const nextLevel = getNextLevel(folder.level, mode);
            if (nextLevel) {
                await loadNodesForPath(mode, nextLevel, folder.id);
            }
        }
    };

    // Get the next hierarchical level based on current level and mode
    const getNextLevel = (currentLevel: number, mode: string): string | null => {
        switch (mode) {
            case 'PNG':
                switch (currentLevel) {
                    case 0: return 'province';
                    case 1: return 'district';
                    case 2: return 'llg';
                    case 3: return 'ward';
                    case 4: return 'location';
                    default: return null;
                }
            case 'ABG':
                switch (currentLevel) {
                    case 0: return 'region';
                    case 1: return 'district';
                    case 2: return 'constituency';
                    default: return null;
                }
            case 'MKA':
                switch (currentLevel) {
                    case 0: return 'region';
                    case 1: return 'ward';
                    default: return null;
                }
            default:
                return null;
        }
    };
    // Toggle a folder selection
    const toggleFolder = useCallback((folder: FolderData, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();

        const currentState = selectedFolders[folder.path];
        const newState = currentState === true ? false : true;

        // Add visual indication if selecting a folder that doesn't meet minimum level
        if (newState && !folderMeetsMinLevel(folder)) {
            toast.warning(`Please select a folder at least ${minLevel} level${minLevel !== 1 ? 's' : ''} deep`);
        }

        // Get all descendant paths for this folder
        const getDescendantPaths = (folderPath: string): string[] => {
            const descendants: string[] = [];
            Object.values(nodes).flat().forEach(node => {
                if (node.path.startsWith(folderPath + '/')) {
                    descendants.push(node.path);
                }
            });
            return descendants;
        };

        // Update this folder and all its descendants
        const descendantPaths = getDescendantPaths(folder.path);
        const updates: Record<string, CheckState> = {
            [folder.path]: newState,
            ...Object.fromEntries(descendantPaths.map(path => [path, newState]))
        };

        // Update ancestor states
        const updateAncestorStates = (path: string) => {
            const pathParts = path.split('/');
            for (let i = pathParts.length - 2; i >= 0; i--) {
                const ancestorPath = pathParts.slice(0, i + 1).join('/');
                const ancestorDescendants = getDescendantPaths(ancestorPath);
                const allDescendantsSelected = ancestorDescendants.every(
                    path => updates[path] === true || selectedFolders[path] === true
                );
                const someDescendantsSelected = ancestorDescendants.some(
                    path => updates[path] === true || selectedFolders[path] === true
                );

                updates[ancestorPath] = allDescendantsSelected ? true :
                    someDescendantsSelected ? "indeterminate" : false;
            }
        };

        updateAncestorStates(folder.path);

        // Update state
        setSelectedFolders(prev => ({
            ...prev,
            ...updates
        }));

        // Update selected paths
        const allPaths = Object.values(nodes).flat().map(n => n.path);
        const newSelectedPaths = allPaths.filter(
            path => updates[path] === true || (selectedFolders[path] === true && !updates.hasOwnProperty(path))
        );

        setSelectedPaths(newSelectedPaths);

        // Validate and call the callback
        const isValid = validateSelections(newSelectedPaths);
        if (isValid && newSelectedPaths.length > 0) {
            onFolderSelect(newSelectedPaths);
        }
    }, [selectedFolders, nodes, minLevel, folderMeetsMinLevel, validateSelections, onFolderSelect]);

    // Render a folder item
    const renderFolder = (folder: FolderData) => {
        const isExpanded = expandedFolders[folder.path];
        const checkState = selectedFolders[folder.path];
        const isTooShallow = !folderMeetsMinLevel(folder);
        const loadingKey = `${mode}-${getNextLevel(folder.level, mode)}-${folder.id}`;
        const isLoading = loadingNodes[loadingKey];
        const childNodes = nodes[loadingKey] || [];

        return (
            <div key={folder.id} className="select-none">
                <div
                    className={`
                        flex items-center gap-2 p-2 rounded-md
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        transition-colors
                        cursor-pointer
                        ${isTooShallow ? 'opacity-80' : ''}
                    `}
                    onClick={(e) => toggleFolder(folder, e)}
                >
                    {childNodes.length > 0 || isLoading ? (
                        <span
                            onClick={(e) => toggleExpand(folder, e)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        >
                            {isLoading ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : isExpanded ? (
                                <ChevronDown size={16} />
                            ) : (
                                <ChevronRight size={16} />
                            )}
                        </span>
                    ) : (
                        <span className="w-4"></span>
                    )}

                    <span className="text-slate-500">
                        {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                    </span>

                    <div className="flex items-center gap-2 flex-grow">
                        <Checkbox
                            id={folder.id}
                            checked={checkState === true}
                            className={`${
                                checkState === "indeterminate"
                                    ? 'data-[state=indeterminate]:bg-slate-300 data-[state=indeterminate]:dark:bg-slate-600'
                                    : ''
                            }`}
                            data-state={
                                checkState === "indeterminate"
                                    ? "indeterminate"
                                    : checkState ? "checked" : "unchecked"
                            }
                            onCheckedChange={() => toggleFolder(folder)}
                        />
                        <Label
                            htmlFor={folder.id}
                            className={`text-sm cursor-pointer flex-grow ${isTooShallow ? 'text-slate-500' : ''}`}
                        >
                            {folder.name}
                            {folder.code && (
                                <span className="ml-2 text-xs text-slate-400">
                                    ({folder.code})
                                </span>
                            )}
                        </Label>

                        {isTooShallow && checkState && (
                            <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500 text-xs">
                                Too shallow
                            </Badge>
                        )}
                    </div>
                </div>

                {isExpanded && (
                    <div className="ml-6">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                            </div>
                        ) : childNodes.length > 0 ? (
                            childNodes.map(child => renderFolder(child))
                        ) : null}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Select location ({mode}):</h3>
                    {minLevel > 0 && (
                        <Badge variant="outline" className="text-xs">
                            <AlertCircle size={12} className="mr-1" />
                            Min level: {minLevel}
                        </Badge>
                    )}
                </div>

                <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : error ? (
                        <div className="text-center p-4 text-red-500">
                            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                            {error}
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => loadNodesForPath(mode, 'root', null)}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : nodes['root'] ? (
                        nodes['root'].map(folder => renderFolder(folder))
                    ) : (
                        <div className="text-center p-4 text-slate-500">
                            No locations found
                        </div>
                    )}
                </div>

                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Selected locations:</h4>
                    {selectedPaths.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No location selected</p>
                    ) : (
                        <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
                            {selectedPaths.map(path => {
                                const allNodes = Object.values(nodes).flat();
                                const node = allNodes.find(n => n.path === path);
                                const isInvalid = !node || node.level < minLevel;

                                return (
                                    <div
                                        key={path}
                                        className={`
                                            py-1 px-2 rounded-md flex justify-between items-center
                                            ${isInvalid
                                            ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200'
                                            : 'bg-slate-100 dark:bg-slate-800'
                                        }
                                        `}
                                    >
                                        <span className="truncate flex-1">{path}</span>
                                        {isInvalid && (
                                            <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500 text-xs whitespace-nowrap">
                                                Too shallow
                                            </Badge>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {invalidSelections.length > 0 && (
                        <div className="text-amber-600 dark:text-amber-400 text-xs flex items-center mt-2">
                            <AlertCircle size={12} className="mr-1 flex-shrink-0" />
                            <span>
                                Please select a location that is at least {minLevel} level{minLevel !== 1 ? 's' : ''} deep
                            </span>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}