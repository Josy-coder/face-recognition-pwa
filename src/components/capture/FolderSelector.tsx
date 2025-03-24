import { useState, useEffect } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ChevronDown, ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface FolderData {
    name: string;
    id: string;
    path: string;
    children: FolderData[];
}

// Sample folder structure
const SAMPLE_FOLDERS: FolderData[] = [
    {
        name: 'Employees',
        id: 'employees',
        path: 'Employees',
        children: [
            {
                name: 'Engineering',
                id: 'engineering',
                path: 'Employees/Engineering',
                children: []
            },
            {
                name: 'Marketing',
                id: 'marketing',
                path: 'Employees/Marketing',
                children: []
            },
            {
                name: 'Sales',
                id: 'sales',
                path: 'Employees/Sales',
                children: []
            },
        ]
    },
    {
        name: 'Customers',
        id: 'customers',
        path: 'Customers',
        children: [
            {
                name: 'Enterprise',
                id: 'enterprise',
                path: 'Customers/Enterprise',
                children: []
            },
            {
                name: 'SMB',
                id: 'smb',
                path: 'Customers/SMB',
                children: []
            },
        ]
    },
    {
        name: 'Events',
        id: 'events',
        path: 'Events',
        children: [
            {
                name: '2023',
                id: 'events-2023',
                path: 'Events/2023',
                children: []
            },
            {
                name: '2024',
                id: 'events-2024',
                path: 'Events/2024',
                children: []
            },
        ]
    },
    {
        name: 'Visitors',
        id: 'visitors',
        path: 'Visitors',
        children: []
    },
];

interface FolderSelectorProps {
    onFolderSelect: (folderPaths: string[]) => void;
}

type CheckState = boolean | 'indeterminate';

export default function FolderSelector({ onFolderSelect }: FolderSelectorProps) {
    const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
    const [selectedFolders, setSelectedFolders] = useState<Record<string, CheckState>>({});
    const [selectedPaths, setSelectedPaths] = useState<string[]>([]);

    // Toggle folder expansion
    const toggleExpand = (folderId: string) => {
        setExpandedFolders(prev => ({
            ...prev,
            [folderId]: !prev[folderId]
        }));
    };

    // Get the check state for a folder
    const getCheckState = (folder: FolderData): CheckState => {
        const state = selectedFolders[folder.id];

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
    };

    // Toggle a folder selection
    const toggleFolder = (folder: FolderData) => {
        const currentState = getCheckState(folder);
        const newState = currentState === true ? false : true;

        // Update this folder and all its descendants
        const updateFolderAndDescendants = (f: FolderData, state: boolean) => {
            const updates: Record<string, CheckState> = { [f.id]: state };

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
    };

    // Update selected paths whenever selections change
    useEffect(() => {
        const paths: string[] = [];

        const collectSelectedPaths = (folder: FolderData) => {
            const state = getCheckState(folder);

            if (state === true) {
                paths.push(folder.path);
            } else if (state === 'indeterminate') {
                folder.children.forEach(collectSelectedPaths);
            }
        };

        SAMPLE_FOLDERS.forEach(collectSelectedPaths);

        setSelectedPaths(paths);
        onFolderSelect(paths);
    }, [selectedFolders, onFolderSelect]);

    // Render a folder item
    const renderFolder = (folder: FolderData, level = 0) => {
        const isExpanded = expandedFolders[folder.id] || false;
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
                        <span onClick={() => toggleExpand(folder.id)} className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300">
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </span>
                    ) : (
                        <span className="w-4"></span>
                    )}

                    <span onClick={() => toggleExpand(folder.id)} className="text-slate-500">
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
                    {SAMPLE_FOLDERS.map(folder => renderFolder(folder))}
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