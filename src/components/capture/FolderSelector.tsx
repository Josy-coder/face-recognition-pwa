// components/capture/FolderSelector.tsx
// Fixed version with proper checkbox state management and selection

import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Folder, FolderOpen, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

// Hierarchical folder structure
interface FolderData {
    id: string;
    name: string;
    path: string;
    type: string;
    parentId: string | null;
    level: number;
    children: FolderData[];
}

interface FolderSelectorProps {
    onFolderSelect: (folderPaths: string[]) => void;
    initialSelected?: string[];
    minLevel?: number; // Minimum folder level required (0 = region, 1 = province, 2 = district, etc.)
}

type CheckState = boolean | "indeterminate";

export default function FolderSelector({
                                           onFolderSelect,
                                           initialSelected = [],
                                           minLevel = 2
                                       }: FolderSelectorProps) {
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [selectedFolders, setSelectedFolders] = useState<Record<string, CheckState>>({});
    const [selectedPaths, setSelectedPaths] = useState<string[]>(initialSelected);
    const [invalidSelections, setInvalidSelections] = useState<string[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    // Fetch geographic data from API
    useEffect(() => {
        const fetchGeoData = async () => {
            setLoading(true);
            setFetchError(null);

            try {
                // Fetch entire location hierarchy in one call
                const response = await fetch('/api/geo/all-locations');
                if (!response.ok) {
                    throw new Error('Failed to fetch location data');
                }

                const data = await response.json();
                console.log('Fetched location data:', data);

                if (!data.locations || data.locations.length === 0) {
                    // If no data returned, use mock data
                    console.log('No location data returned, using mock data');
                    return;
                }

                setFolders(data.locations || []);

                // Initialize expanded folders for regions
                const initialExpanded: Record<string, boolean> = {};

                // Expand root level folders by default
                if (data.locations && data.locations.length > 0) {
                    data.locations.forEach((folder: FolderData) => {
                        initialExpanded[folder.path] = true;
                    });
                }

                // If there are initial selections, expand their parent paths and set selected state
                if (initialSelected && initialSelected.length > 0) {
                    const initialState: Record<string, CheckState> = {};

                    initialSelected.forEach(path => {
                        initialState[path] = true;

                        // Expand all parent folders
                        const pathParts = path.split('/');
                        let currentPath = '';

                        for (let i = 0; i < pathParts.length; i++) {
                            if (i === 0) {
                                currentPath = pathParts[i];
                            } else {
                                currentPath += '/' + pathParts[i];
                            }

                            initialExpanded[currentPath] = true;
                        }
                    });

                    setSelectedFolders(initialState);
                }

                setExpandedFolders(initialExpanded);

                // Validate initial selections
                validateSelections(initialSelected);

            } catch (error) {
                console.error('Error fetching geographical data:', error);
                setFetchError('Failed to load location data. Please try again later.');
                toast.error('Failed to load location data');
            } finally {
                setLoading(false);
            }
        };

        fetchGeoData();
    }, [initialSelected, retryCount]);

    // Toggle folder expansion
    const toggleExpand = (folderId: string, event: React.MouseEvent) => {
        event.stopPropagation(); // Prevent it from triggering the checkbox
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    // Check if a folder meets the minimum level requirement
    const folderMeetsMinLevel = (folder: FolderData): boolean => {
        return folder.level >= minLevel;
    };

    // Validate selections against minimum level
    const validateSelections = (paths: string[]): boolean => {
        const invalid = paths.filter(path => {
            // Find the folder object to get its level
            const findFolder = (folders: FolderData[], path: string): FolderData | null => {
                for (const folder of folders) {
                    if (folder.path === path) return folder;
                    if (folder.children.length > 0) {
                        const found = findFolder(folder.children, path);
                        if (found) return found;
                    }
                }
                return null;
            };

            const folder = findFolder(folders, path);
            if (!folder) return true; // If folder not found, mark as invalid
            return folder.level < minLevel;
        });

        setInvalidSelections(invalid);
        return invalid.length === 0;
    };

    // Get the check state for a folder
    const getCheckState = useCallback((folder: FolderData): CheckState => {
        // If directly checked, return true
        if (selectedFolders[folder.path] === true) return true;

        // If directly unchecked, check children
        if (selectedFolders[folder.path] === false) {
            // Even if explicitly unchecked, if any child is checked, we need indeterminate
            const anyChildChecked = hasCheckedDescendant(folder);
            return anyChildChecked ? "indeterminate" : false;
        }

        // If not explicitly set, determine based on children
        if (folder.children.length === 0) return false;

        // Check if any children are checked or indeterminate
        const childStates = folder.children.map(child => getCheckState(child));

        // If all children are checked
        if (childStates.every(state => state === true)) return true;

        // If any child is checked or indeterminate
        if (childStates.some(state => state === true || state === "indeterminate")) return "indeterminate";

        return false;
    }, [selectedFolders]);

    // Helper to check if any descendant is checked
    const hasCheckedDescendant = useCallback((folder: FolderData): boolean => {
        // Check if this folder is directly checked
        if (selectedFolders[folder.path] === true) return true;

        // Check children recursively
        for (const child of folder.children) {
            if (hasCheckedDescendant(child)) return true;
        }

        return false;
    }, [selectedFolders]);

    // Toggle a folder selection
    const toggleFolder = useCallback((folder: FolderData, event?: React.MouseEvent) => {
        if (event) event.stopPropagation();

        const currentState = selectedFolders[folder.path];
        const newState = currentState === true ? false : true;

        // Add visual indication if selecting a folder that doesn't meet minimum level
        if (newState && !folderMeetsMinLevel(folder)) {
            toast.warning(`Please select a folder at least ${minLevel} level${minLevel !== 1 ? 's' : ''} deep`);
        }

        // Update this folder and all its descendants
        const updateDescendants = (f: FolderData, state: boolean) => {
            const updates: Record<string, CheckState> = { [f.path]: state };

            f.children.forEach(child => {
                const childUpdates = updateDescendants(child, state);
                Object.assign(updates, childUpdates);
            });

            return updates;
        };

        const descendantUpdates = updateDescendants(folder, newState);

        // Also update ancestors appropriately (to indeterminate if needed)
        const updatedState = {
            ...selectedFolders,
            ...descendantUpdates
        };

        setSelectedFolders(updatedState);

        // Update selected paths immediately for better UX
        updateSelectedPaths(updatedState);
    }, [selectedFolders, minLevel, folderMeetsMinLevel]);

    // Update selected paths based on selectedFolders state
    const updateSelectedPaths = useCallback((folderState: Record<string, CheckState> = selectedFolders) => {
        if (folders.length === 0) return;

        const paths: string[] = [];

        // Recursive function to collect all checked paths
        const collectSelectedPaths = (folder: FolderData) => {
            const state = folderState[folder.path];

            if (state === true) {
                paths.push(folder.path);
            } else {
                // Check children individually in case some are selected
                folder.children.forEach(child => collectSelectedPaths(child));
            }
        };

        folders.forEach(folder => collectSelectedPaths(folder));

        // Update state
        setSelectedPaths(paths);

        // Validate and call the callback
        const isValid = validateSelections(paths);
        if (isValid && paths.length > 0) {
            onFolderSelect(paths);
        } else if (paths.length > 0) {
            // Filter out invalid paths for the callback
            const validPaths = paths.filter(p => !invalidSelections.includes(p));
            if (validPaths.length > 0) {
                onFolderSelect(validPaths);
            }
        }
    }, [folders, selectedFolders, onFolderSelect, validateSelections, invalidSelections]);

    // Update selected paths whenever folders or selections change
    useEffect(() => {
        updateSelectedPaths();
    }, [selectedFolders, folders, updateSelectedPaths]);

    // Use mock data if real data isn't available
    const useMockData = () => {
        // Simple mock data structure
        const mockFolders: FolderData[] = [
            {
                id: "png-id",
                name: "PNG",
                path: "PNG",
                type: "region",
                parentId: null,
                level: 0,
                children: [
                    {
                        id: "central-id",
                        name: "Central Province",
                        path: "PNG/Central Province",
                        type: "province",
                        parentId: "png-id",
                        level: 1,
                        children: [
                            {
                                id: "district1-id",
                                name: "Kairuku District",
                                path: "PNG/Central Province/Kairuku District",
                                type: "district",
                                parentId: "central-id",
                                level: 2,
                                children: []
                            },
                            {
                                id: "district2-id",
                                name: "Goilala District",
                                path: "PNG/Central Province/Goilala District",
                                type: "district",
                                parentId: "central-id",
                                level: 2,
                                children: []
                            }
                        ]
                    },
                    {
                        id: "eastern-id",
                        name: "Eastern Highlands Province",
                        path: "PNG/Eastern Highlands Province",
                        type: "province",
                        parentId: "png-id",
                        level: 1,
                        children: [
                            {
                                id: "district3-id",
                                name: "Goroka District",
                                path: "PNG/Eastern Highlands Province/Goroka District",
                                type: "district",
                                parentId: "eastern-id",
                                level: 2,
                                children: []
                            }
                        ]
                    }
                ]
            },
            {
                id: "abg-id",
                name: "ABG",
                path: "ABG",
                type: "region",
                parentId: null,
                level: 0,
                children: [
                    {
                        id: "north-id",
                        name: "North Region",
                        path: "ABG/North Region",
                        type: "region",
                        parentId: "abg-id",
                        level: 1,
                        children: [
                            {
                                id: "district4-id",
                                name: "Buka District",
                                path: "ABG/North Region/Buka District",
                                type: "district",
                                parentId: "north-id",
                                level: 2,
                                children: []
                            }
                        ]
                    }
                ]
            },
            {
                id: "mka-id",
                name: "MKA",
                path: "MKA",
                type: "region",
                parentId: null,
                level: 0,
                children: [
                    {
                        id: "region1-id",
                        name: "MKA Region 1",
                        path: "MKA/MKA Region 1",
                        type: "region",
                        parentId: "mka-id",
                        level: 1,
                        children: [
                            {
                                id: "ward1-id",
                                name: "Ward 1",
                                path: "MKA/MKA Region 1/Ward 1",
                                type: "ward",
                                parentId: "region1-id",
                                level: 2,
                                children: []
                            }
                        ]
                    }
                ]
            }
        ];

        setFolders(mockFolders);

        // Set expanded state for mock data
        const initialExpanded: Record<string, boolean> = {};
        mockFolders.forEach(folder => {
            initialExpanded[folder.path] = true;
        });
        setExpandedFolders(initialExpanded);

        setLoading(false);
    };

    // Retry loading data
    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
    };

    // Render a folder item
    const renderFolder = (folder: FolderData, level = 0) => {
        const isExpanded = expandedFolders[folder.path] || false;
        const checkState = getCheckState(folder);
        const hasChildren = folder.children.length > 0;
        const isTooShallow = !folderMeetsMinLevel(folder);

        return (
            <div key={folder.id} className="select-none">
                <div
                    className={`
                        flex items-center gap-2 p-2 rounded-md
                        ${level > 0 ? 'ml-6' : ''}
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        transition-colors
                        cursor-pointer
                        ${isTooShallow ? 'opacity-80' : ''}
                    `}
                    onClick={(e) => toggleFolder(folder, e)}
                >
                    {hasChildren ? (
                        <span
                            onClick={(e) => toggleExpand(folder.path, e)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    ) : (
                        <span className="w-4"></span>
                    )}

                    <span
                        onClick={(e) => toggleExpand(folder.path, e)}
                        className="text-slate-500"
                    >
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

                            {/* Show level indicator */}
                            <span className="ml-2 text-xs text-slate-400">
                                (Level {folder.level})
                            </span>

                            {/* Show warning for shallow folders */}
                            {isTooShallow && checkState && (
                                <Badge variant="outline" className="ml-2 text-amber-500 border-amber-500 text-xs">
                                    Too shallow
                                </Badge>
                            )}
                        </Label>
                    </div>
                </div>

                {isExpanded && hasChildren && (
                    <div className="ml-2">
                        {folder.children.map(child => renderFolder(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="font-medium">Select location:</h3>
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
                            <RefreshCw className="animate-spin h-6 w-6 text-primary" />
                        </div>
                    ) : fetchError ? (
                        <div className="text-center p-4 text-red-500">
                            <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                            {fetchError}
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={handleRetry}
                            >
                                Retry
                            </Button>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="text-center p-4 text-slate-500">
                            <p>No locations found.</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={useMockData}
                            >
                                Use Demo Data
                            </Button>
                        </div>
                    ) : (
                        folders.map(folder => renderFolder(folder))
                    )}
                </div>

                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Selected location:</h4>
                    {selectedPaths.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No location selected</p>
                    ) : (
                        <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
                            {selectedPaths.map(path => {
                                // Find the folder to check if it's valid
                                const findFolder = (folders: FolderData[], path: string): FolderData | null => {
                                    for (const folder of folders) {
                                        if (folder.path === path) return folder;
                                        if (folder.children.length > 0) {
                                            const found = findFolder(folder.children, path);
                                            if (found) return found;
                                        }
                                    }
                                    return null;
                                };

                                const folder = findFolder(folders, path);
                                const isInvalid = !folder || folder.level < minLevel;

                                return (
                                    <div
                                        key={path}
                                        className={`py-1 px-2 rounded-md flex justify-between items-center ${
                                            isInvalid
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200'
                                                : 'bg-slate-100 dark:bg-slate-800'
                                        }`}
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