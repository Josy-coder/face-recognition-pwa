import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MapPin, ChevronRight } from 'lucide-react';

interface ResidentialPathDisplayProps {
    path: string;
    clickable?: boolean;
    showFullPath?: boolean;
    onNodeClick?: (node: string, fullPath: string, index: number) => void;
    className?: string;
}

export default function ResidentialPathDisplay({
                                                   path,
                                                   clickable = false,
                                                   showFullPath = false,
                                                   onNodeClick,
                                                   className = ''
                                               }: ResidentialPathDisplayProps) {
    const [pathParts, setPathParts] = useState<string[]>([]);
    const [collection, setCollection] = useState<string>('');

    useEffect(() => {
        if (path) {
            // Split the path into parts
            const parts = path.split('/').filter(Boolean);

            // Set the collection (first part) and the remaining parts
            if (parts.length > 0) {
                setCollection(parts[0]);
                setPathParts(parts.slice(1));
            } else {
                setCollection('');
                setPathParts([]);
            }
        } else {
            setCollection('');
            setPathParts([]);
        }
    }, [path]);

// Get path up to a certain index
    const getPathUpToIndex = (index: number): string => {
        return `${collection}/${pathParts.slice(0, index + 1).join('/')}`;
    };

    // Handle node click
    const handleNodeClick = (index: number) => {
        if (clickable && onNodeClick) {
            const node = pathParts[index];
            const fullPath = getPathUpToIndex(index);
            onNodeClick(node, fullPath, index);
        }
    };

    // Determine label for a given index in the PNG hierarchy
    const getNodeLabel = (index: number): string => {
        if (collection === 'PNG') {
            switch (index) {
                case 0: return 'Province';
                case 1: return 'District';
                case 2: return 'LLG';
                case 3: return 'Ward';
                default: return 'Location';
            }
        } else if (collection === 'ABG') {
            switch (index) {
                case 0: return 'Region';
                case 1: return 'District';
                case 2: return 'COE';
                default: return 'Location';
            }
        } else if (collection === 'MKA') {
            switch (index) {
                case 0: return 'Division';
                case 1: return 'Area';
                default: return 'Location';
            }
        }
        return 'Location';
    };

    if (!path) {
        return (
            <Card className={`border-slate-200 dark:border-slate-700 ${className}`}>
                <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center">
                        <MapPin className="mr-2 h-5 w-5 text-slate-400" />
                        No Location Data
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">
                        Residential location information is not available.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={`border-slate-200 dark:border-slate-700 ${className}`}>
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center">
                    <MapPin className="mr-2 h-5 w-5 text-indigo-500" />
                    Residential Location
                </CardTitle>
            </CardHeader>
            <CardContent>
                {/* Collection */}
                <div className="mb-2">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Collection:
          </span>
                    <span className="ml-2 text-sm text-slate-600 dark:text-slate-400">
            {collection}
          </span>
                </div>

                {/* Location breadcrumb display */}
                <div className="flex flex-wrap items-center gap-1 mb-4">
                    {pathParts.map((part, index) => (
                        <div key={index} className="flex items-center">
                            {index > 0 && (
                                <ChevronRight size={16} className="text-slate-400 mx-1" />
                            )}

                            {clickable ? (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className={`h-7 px-2 py-1 text-sm ${
                                        index === pathParts.length - 1
                                            ? 'font-medium text-indigo-600 dark:text-indigo-400'
                                            : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                    onClick={() => handleNodeClick(index)}
                                >
                                    {part}
                                </Button>
                            ) : (
                                <span className={`text-sm ${
                                    index === pathParts.length - 1
                                        ? 'font-medium text-indigo-600 dark:text-indigo-400'
                                        : 'text-slate-600 dark:text-slate-400'
                                }`}>
                  {part}
                </span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Detailed path information */}
                <div className="space-y-2">
                    {pathParts.map((part, index) => (
                        <div key={index} className="flex items-baseline">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-20">
                {getNodeLabel(index)}:
              </span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 ml-2">
                {part}
              </span>
                        </div>
                    ))}
                </div>

                {/* Show full path if requested */}
                {showFullPath && (
                    <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex items-center">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Full Path:
              </span>
                            <code className="ml-2 text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-700 dark:text-slate-300 flex-1 overflow-x-auto">
                                {path}
                            </code>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}