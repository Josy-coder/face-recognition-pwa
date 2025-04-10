import { useState, useEffect, useCallback } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

interface FolderData {
    name: string;
    id: string;
    path: string;
    children: FolderData[];
}

interface FolderSelectorProps {
    onFolderSelect: (folderPaths: string[]) => void;
    initialSelected?: string[];
}

type CheckState = boolean | 'indeterminate';

export default function FolderSelector({ onFolderSelect, initialSelected = [] }: FolderSelectorProps) {
    const [loading, setLoading] = useState(true);
    const [folders, setFolders] = useState<FolderData[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [selectedFolders, setSelectedFolders] = useState<Record<string, CheckState>>({});
    const [selectedPaths, setSelectedPaths] = useState<string[]>(initialSelected);
    const [hasFetchedFolders, setHasFetchedFolders] = useState(false);

    // Process raw folder paths into hierarchical structure
    const processFolderData = useCallback((folderPaths: string[]): FolderData[] => {
        const rootFolders: FolderData[] = [];
        const folderMap: Record<string, FolderData> = {};

        // First pass: create folder objects
        folderPaths.forEach(path => {
            const parts = path.split('/').filter(Boolean);

            parts.forEach((part, index) => {
                const currentPath = parts.slice(0, index + 1).join('/');

                if (!folderMap[currentPath]) {
                    folderMap[currentPath] = {
                        name: part,
                        id: currentPath,
                        path: currentPath,
                        children: []
                    };
                }
            });
        });

        // Second pass: build the hierarchy
        Object.values(folderMap).forEach(folder => {
            const lastSlashIndex = folder.path.lastIndexOf('/');

            if (lastSlashIndex === -1) {
                // Root level folder
                rootFolders.push(folder);
            } else {
                // Nested folder
                const parentPath = folder.path.substring(0, lastSlashIndex);
                if (folderMap[parentPath]) {
                    folderMap[parentPath].children.push(folder);
                }
            }
        });

        return rootFolders;
    }, []);

    // Fetch folder structure from the API only once
    useEffect(() => {
        if (hasFetchedFolders) return; // Skip if we already fetched

        const fetchFolders = async () => {
            setLoading(true);
            try {
                const response = await fetch('/api/s3/list-folders?public=true');

                if (!response.ok) {
                    throw new Error('Failed to fetch folders');
                }

                const data = await response.json();

                // Process the folders into a hierarchical structure
                const processedFolders = processFolderData(data.folders || []);
                setFolders(processedFolders);

                // Initialize selected folders from initialSelected prop
                if (initialSelected && initialSelected.length > 0) {
                    const initialState: Record<string, CheckState> = {};

                    initialSelected.forEach(path => {
                        initialState[path] = true;

                        // Also expand parent folders
                        let parentPath = '';
                        const parts = path.split('/');

                        for (let i = 0; i < parts.length - 1; i++) {
                            parentPath += (i === 0 ? '' : '/') + parts[i];
                            setExpandedFolders(prev => ({
                                ...prev,
                                [parentPath]: true
                            }));
                        }
                    });

                    setSelectedFolders(initialState);
                }

                // Mark as fetched to prevent additional fetches
                setHasFetchedFolders(true);
            } catch (error) {
                console.error('Error fetching folders:', error);
                toast.error('Failed to fetch folders');
            } finally {
                setLoading(false);
            }
        };

        fetchFolders();
    }, [initialSelected, processFolderData, hasFetchedFolders]); // Only depend on initialSelected

    // Toggle folder expansion
    const toggleExpand = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    // Get the check state for a folder
    const getCheckState = useCallback((folder: FolderData): CheckState => {
        const state = selectedFolders[folder.path];

        // If state is explicitly set, return it
        if (state !== undefined) return state;

        // Otherwise, compute state based on children
        if (folder.children.length === 0) return false;

        const childStates = folder.children.map(child => getCheckState(child));

        // If all children are checked, folder is checked
        if (childStates.every(state => state === true)) return true;

        // If some children are checked or indeterminate, folder is indeterminate
        if (childStates.some(state => state === true || state === 'indeterminate')) return 'indeterminate';

        // Otherwise, folder is unchecked
        return false;
    }, [selectedFolders]);

    // Toggle a folder selection
    const toggleFolder = useCallback((folder: FolderData) => {
        const currentState = getCheckState(folder);
        const newState = currentState === true ? false : true;

        // Update this folder and all its descendants
        const updateFolderAndDescendants = (f: FolderData, state: boolean) => {
            const updates: Record<string, CheckState> = { [f.path]: state };

            f.children.forEach(child => {
                const childUpdates = updateFolderAndDescendants(child, state);
                Object.assign(updates, childUpdates);
            });

            return updates;
        };

        const updates = updateFolderAndDescendants(folder, newState);

        setSelectedFolders(prev => ({
            ...prev,
            ...updates
        }));
    }, [getCheckState]);

    // Update selected paths whenever selections change
    useEffect(() => {
        // Skip if folders aren't loaded yet
        if (folders.length === 0) return;

        const paths: string[] = [];

        const collectSelectedPaths = (folder: FolderData) => {
            const state = getCheckState(folder);

            if (state === true) {
                paths.push(folder.path);
            } else if (state === 'indeterminate') {
                folder.children.forEach(collectSelectedPaths);
            }
        };

        folders.forEach(collectSelectedPaths);

        setSelectedPaths(paths);

        // Only call onFolderSelect if paths have actually changed
        if (JSON.stringify(paths) !== JSON.stringify(selectedPaths)) {
            onFolderSelect(paths);
        }
    }, [selectedFolders, folders, onFolderSelect, getCheckState, selectedPaths]);

    // Render a folder item
    const renderFolder = (folder: FolderData, level = 0) => {
        const isExpanded = expandedFolders[folder.path] || false;
        const checkState = getCheckState(folder);
        const hasChildren = folder.children.length > 0;

        return (
            <div key={folder.id} className="select-none">
                <div
                    className={`
                        flex items-center gap-2 p-2 rounded-md
                        ${level > 0 ? 'ml-6' : ''}
                        hover:bg-slate-100 dark:hover:bg-slate-800
                        transition-colors
                        cursor-pointer
                    `}
                >
                    {hasChildren ? (
                        <span
                            onClick={() => toggleExpand(folder.path)}
                            className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                        >
                            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                        </span>
                    ) : (
                        <span className="w-4"></span>
                    )}

                    <span
                        onClick={() => toggleExpand(folder.path)}
                        className="text-slate-500"
                    >
                        {isExpanded ? <FolderOpen size={18} /> : <Folder size={18} />}
                    </span>

                    <div className="flex items-center gap-2 flex-grow" onClick={() => toggleFolder(folder)}>
                        <Checkbox
                            id={folder.id}
                            checked={checkState === true}
                            className="data-[state=indeterminate]:bg-slate-300 data-[state=indeterminate]:dark:bg-slate-600"
                            data-state={checkState === 'indeterminate' ? 'indeterminate' : checkState ? 'checked' : 'unchecked'}
                            onCheckedChange={() => toggleFolder(folder)}
                        />
                        <Label
                            htmlFor={folder.id}
                            className="text-sm cursor-pointer flex-grow"
                        >
                            {folder.name}
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
                <h3 className="font-medium mb-3">Select folders to search:</h3>
                <div className="max-h-60 overflow-y-auto border rounded-md p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700">
                    {loading ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        </div>
                    ) : folders.length === 0 ? (
                        <div className="text-center p-4 text-slate-500">
                            No folders found. Please create a collection first.
                        </div>
                    ) : (
                        folders.map(folder => renderFolder(folder))
                    )}
                </div>

                <div className="mt-4 space-y-2">
                    <h4 className="text-sm font-medium">Selected paths:</h4>
                    {selectedPaths.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-slate-400">No folders selected</p>
                    ) : (
                        <div className="text-sm space-y-1 max-h-20 overflow-y-auto">
                            {selectedPaths.map(path => (
                                <div key={path} className="py-1 px-2 bg-slate-100 dark:bg-slate-800 rounded-md">
                                    {path}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}