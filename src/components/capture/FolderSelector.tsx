import { useEffect, useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen } from 'lucide-react';
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
    onSelect: (selectedPath: string | null) => void;
}

export default function FolderSelector({ onSelect }: FolderSelectorProps) {
    const [treeData, setTreeData] = useState<LocationNode[]>([]);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [selectedPath, setSelectedPath] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/geo/all-locations')
            .then(res => res.json())
            .then(data => {
                if (!data.locations) throw new Error('No locations returned');
                setTreeData(data.locations);
            })
            .catch(err => {
                console.error(err);
                toast.error('Failed to load folder structure');
            });
    }, []);

    const toggleExpand = (id: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const renderTree = (node: LocationNode, level = 0): JSX.Element => {
        const isExpanded = expanded.has(node.id);
        const hasChildren = node.children?.length > 0;

        return (
            <div key={node.id} className="ml-4 mt-1">
                <div className="flex items-center gap-2">
                    {hasChildren && (
                        <span
                            className="cursor-pointer text-slate-500"
                            onClick={() => toggleExpand(node.id)}
                        >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
                    )}
                    {!hasChildren && <span className="w-4" />}
                    <Folder size={14} className="text-slate-400" />
                    <Checkbox
                        checked={selectedPath === node.path}
                        onCheckedChange={() => {
                            const path = selectedPath === node.path ? null : node.path;
                            setSelectedPath(path);
                            onSelect(path);
                        }}
                        className="scale-90"
                    />
                    <Label className="text-sm cursor-pointer">{node.name}</Label>
                </div>
                {isExpanded && level < 2 && node.children && (
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
                <h3 className="text-sm font-medium mb-2">Select Location (Max Depth: 2)</h3>
                <div className="max-h-64 overflow-y-auto">
                    {treeData.map(root => renderTree(root))}
                </div>
            </CardContent>
        </Card>
    );
}
