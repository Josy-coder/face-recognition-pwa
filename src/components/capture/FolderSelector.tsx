import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Folder } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface LocationNode {
    id: string;
    name: string;
    path: string;
    level: number;
    children: LocationNode[];
}

interface FolderSelectorProps {
    // Support both prop names for backward compatibility
    onSelect?: (selectedPath: string | null) => void;
    onFolderSelect?: (selectedPaths: string[]) => void;
    initialSelected?: string[];
    minLevel?: number;
}

export default function FolderSelector({
                                           onSelect,
                                           onFolderSelect,
                                           initialSelected = [],
                                           minLevel = 0
                                       }: FolderSelectorProps) {
    const [treeData, setTreeData] = useState<LocationNode[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selectedPaths, setSelectedPaths] = useState<string[]>(initialSelected || []);
    const [isInitialized, setIsInitialized] = useState(false);

    // Load location data
    useEffect(() => {
        // Create a reference to track if component is mounted
        let isMounted = true;

        // Only fetch data if we don't already have it
        if (treeData.length === 0) {
            fetch('/api/geo/all-locations')
                .then(res => res.json())
                .then(data => {
                    // Only update state if component is still mounted
                    if (isMounted) {
                        if (!data.locations) throw new Error('No locations returned');
                        setTreeData(data.locations);
                        setIsInitialized(true);
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        console.error(err);
                        toast.error('Failed to load folder structure');
                    }
                });
        }

        // Handle expanding paths for initialSelected separately
        if (initialSelected && initialSelected.length > 0) {
            const pathsToExpand = new Set<string>();

            initialSelected.forEach(path => {
                // Split the path to get all parent paths
                const parts = path.split('/');
                let currentPath = '';

                for (let i = 0; i < parts.length - 1; i++) {
                    if (currentPath === '') {
                        currentPath = parts[i];
                    } else {
                        currentPath = `${currentPath}/${parts[i]}`;
                    }

                    if (currentPath) {
                        pathsToExpand.add(currentPath);
                    }
                }
            });

            setExpanded(pathsToExpand);
        }

        // Cleanup function to prevent memory leaks
        return () => {
            isMounted = false;
        };
    }, []);

    // When selectedPaths change, notify parent component
    useEffect(() => {
        if (isInitialized) {
            // Support both callback formats for backward compatibility
            if (onFolderSelect) {
                onFolderSelect(selectedPaths);
            }

            if (onSelect) {
                // For the old callback format, only pass the first selected path or null
                onSelect(selectedPaths.length > 0 ? selectedPaths[0] : null);
            }
        }
    }, [selectedPaths, onFolderSelect, onSelect, isInitialized]);

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handlePathSelection = (path: string, isSelected: boolean) => {
        if (isSelected) {
            // Add to selection
            setSelectedPaths(prev => {
                // If we're enforcing a minimum level, check that the path meets the requirements
                const pathParts = path.split('/');
                if (minLevel && pathParts.length < minLevel) {
                    toast.error(`Please select a location with at least ${minLevel} levels`);
                    return prev;
                }

                // If we already have this path, no change needed
                if (prev.includes(path)) return prev;

                // Otherwise add it (replacing any existing selection because we only allow one)
                return [path];
            });
        } else {
            // Remove from selection
            setSelectedPaths(prev => prev.filter(p => p !== path));
        }
    };

    const renderTree = (node: LocationNode, level = 0): JSX.Element => {
        const isExpanded = expanded.has(node.path);
        const hasChildren = node.children?.length > 0;
        const isSelected = selectedPaths.includes(node.path);

        return (
            <div key={node.id} className="ml-4 mt-1">
                <div className="flex items-center gap-2">
                    {hasChildren ? (
                        <span
                            className="cursor-pointer text-slate-500"
                            onClick={() => toggleExpand(node.path)}
                        >
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                    ) : (
                        <span className="w-4" />
                    )}
                    <Folder size={14} className="text-slate-400" />
                    <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => handlePathSelection(node.path, checked === true)}
                        className="scale-90"
                        id={`checkbox-${node.id}`}
                    />
                    <Label
                        htmlFor={`checkbox-${node.id}`}
                        className="text-sm cursor-pointer"
                    >
                        {node.name}
                    </Label>
                </div>
                {(isExpanded || level < 1) && node.children && (
                    <div className="ml-4">
                        {node.children.map(child => renderTree(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card>
            <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">
                    Select Location {minLevel > 0 ? `(Minimum ${minLevel} levels required)` : ''}
                </h3>
                <div className="max-h-64 overflow-y-auto">
                    {treeData.map(root => renderTree(root))}
                </div>
                {selectedPaths.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200">
                        <p className="text-sm font-medium">Selected:</p>
                        {selectedPaths.map(path => (
                            <p key={path} className="text-xs text-slate-500 truncate">{path}</p>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}