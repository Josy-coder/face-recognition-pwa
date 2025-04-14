import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { MapPin, FolderTree, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

interface LocationOption {
    value: string;
    label: string;
    path: string;
}

interface LevelSelectorProps {
    label: string;
    options: LocationOption[];
    value: string;
    onChange: (value: string) => void;
    isLoading: boolean;
}

// Individual level selector component
function LevelSelector({ label, options, value, onChange, isLoading }: LevelSelectorProps) {
    return (
        <div className="space-y-2">
            <Label className="flex items-center text-sm">
                <FolderTree className="mr-1 h-4 w-4 text-slate-500" />
                {label}
            </Label>
            <Select
                value={value}
                onValueChange={onChange}
                disabled={isLoading || options.length === 0}
            >
                <SelectTrigger className="w-full">
                    <SelectValue placeholder={`Select ${label}`} />
                </SelectTrigger>
                <SelectContent>
                    {options.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}

interface S3LocationSelectorProps {
    collection: string;
    onPathChange: (path: string) => void;
    initialPath?: string;
    required?: boolean;
    maxDepth?: number; // Maximum number of levels to show
}

export default function S3LocationSelector({
                                               collection,
                                               onPathChange,
                                               initialPath = '',
                                               maxDepth = 4 // Default to 4 levels (province, district, LLG, ward)
                                           }: S3LocationSelectorProps) {
    // Track levels - each level has options, selected value, and a label
    const [levels, setLevels] = useState<Array<{
        options: LocationOption[];
        selected: string;
        label: string;
        isLoading: boolean;
    }>>([]);

    // Helper function to get the default label for a level
    const getLevelLabel = (index: number): string => {
        if (collection === 'PNG') {
            // PNG has standard province/district/LLG/ward hierarchy
            switch (index) {
                case 0: return 'Province';
                case 1: return 'District';
                case 2: return 'LLG';
                case 3: return 'Ward';
                default: return `Level ${index + 1}`;
            }
        } else if (collection === 'ABG') {
            // ABG might have a different structure
            switch (index) {
                case 0: return 'Region';
                case 1: return 'District';
                case 2: return 'COE';
                default: return `Level ${index + 1}`;
            }
        } else if (collection === 'MKA') {
            // MKA might have a different structure
            switch (index) {
                case 0: return 'Division';
                case 1: return 'Area';
                default: return `Level ${index + 1}`;
            }
        } else {
            return `Level ${index + 1}`;
        }
    };

    // Initialize with first level
    useEffect(() => {
        // Start with the collection level
        fetchSubfolders(collection, 0);
    }, [collection]);

    // Process initial path if provided
    useEffect(() => {
        if (initialPath && initialPath.startsWith(collection)) {
            const parts = initialPath.split('/').filter(Boolean);
            // Remove collection from parts if it's included
            if (parts[0] === collection) {
                parts.shift();
            }

            // If we have parts, load each level sequentially
            if (parts.length > 0) {
                // We'll need to load each level in sequence
                loadInitialPath(parts);
            }
        }
    }, [initialPath, collection]);

    // Fetch subfolders for a given path and level
    const fetchSubfolders = async (path: string, levelIndex: number) => {
        // Create a copy of current levels
        const updatedLevels = [...levels];

        // If the level doesn't exist yet, create it
        if (!updatedLevels[levelIndex]) {
            updatedLevels[levelIndex] = {
                options: [],
                selected: '',
                label: getLevelLabel(levelIndex),
                isLoading: true
            };
        } else {
            // Otherwise just set loading to true
            updatedLevels[levelIndex].isLoading = true;
        }

        // Update state
        setLevels(updatedLevels);

        try {
            // Call API to get subfolders
            const response = await fetch(`/api/locations/${collection}/subfolders?prefix=${encodeURIComponent(path.replace(`${collection}/`, ''))}`);

            if (!response.ok) {
                throw new Error('Failed to fetch subfolders');
            }

            const data = await response.json();
            const options = data.subfolders || [];

            // Update the level with the new options
            updatedLevels[levelIndex] = {
                ...updatedLevels[levelIndex],
                options,
                isLoading: false
            };

            // Remove any levels deeper than this one
            updatedLevels.splice(levelIndex + 1);

            // Update state
            setLevels(updatedLevels);
        } catch (error) {
            console.error('Error fetching subfolders:', error);
            toast.error('Failed to load location data');

            // Update loading state
            updatedLevels[levelIndex].isLoading = false;
            setLevels(updatedLevels);
        }
    };

    // Load levels for an initial path
    const loadInitialPath = async (pathParts: string[]) => {
        let currentPath = collection;

        // Load each part of the path sequentially
        for (let i = 0; i < pathParts.length && i < maxDepth; i++) {
            // Fetch subfolders for this level
            await fetchSubfolders(currentPath, i);

            // Update the current path
            currentPath = `${currentPath}/${pathParts[i]}`;

            // Set the selected value for this level
            setLevels(prev => {
                const updated = [...prev];
                if (updated[i]) {
                    updated[i].selected = currentPath;
                }
                return updated;
            });
        }
    };

    // Handle selection change at a level
    const handleLevelChange = (value: string, levelIndex: number) => {
        // Update the selected value for this level
        const updatedLevels = [...levels];
        updatedLevels[levelIndex].selected = value;

        // Remove any levels deeper than this one
        updatedLevels.splice(levelIndex + 1);

        // Update state
        setLevels(updatedLevels);

        // If this isn't the maximum depth, fetch subfolders for the next level
        if (levelIndex < maxDepth - 1) {
            fetchSubfolders(value, levelIndex + 1);
        }

        // Update the full path
        onPathChange(value);
    };

    // Get the currently selected path
    const getFullPath = (): string => {
        // Find the deepest selected value
        for (let i = levels.length - 1; i >= 0; i--) {
            if (levels[i]?.selected) {
                return levels[i].selected;
            }
        }
        return collection;
    };

    // Reset all selections
    const resetSelections = () => {
        // Start over from first level
        setLevels([]);
        fetchSubfolders(collection, 0);
        onPathChange(collection);
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center">
                        <MapPin className="mr-2 h-5 w-5 text-indigo-500" />
                        {collection} Location Hierarchy
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetSelections}
                        className="h-8 px-2 text-slate-500"
                    >
                        Reset
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3">
                    {/* Render each level */}
                    {levels.map((level, index) => (
                        <div key={index} className="relative">
                            {level.isLoading && (
                                <div className="absolute right-2 top-8">
                                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                </div>
                            )}
                            <LevelSelector
                                label={level.label}
                                options={level.options}
                                value={level.selected}
                                onChange={(value) => handleLevelChange(value, index)}
                                isLoading={level.isLoading}
                            />
                        </div>
                    ))}
                </div>

                {/* Show the current path */}
                <div className="pt-2">
                    <p className="text-xs text-slate-500">
                        Current Path: {getFullPath()}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
}