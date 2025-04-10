import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronDown, Folder, FolderPlus, RefreshCw, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface S3FolderBrowserProps {
    onSelectFolder: (folderPath: string) => void;
    initialPath?: string;
    authHeader: string;
    allowCreateFolder?: boolean;
}

interface FolderItem {
    name: string;
    path: string;
    isOpen?: boolean;
    children?: FolderItem[];
    isLoaded?: boolean;
}

const S3FolderBrowser = ({
                             onSelectFolder,
                             initialPath = '',
                             authHeader,
                             allowCreateFolder = true
                         }: S3FolderBrowserProps) => {
    const [rootFolders, setRootFolders] = useState<FolderItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [currentPath, setCurrentPath] = useState(initialPath);
    const [breadcrumbs, setBreadcrumbs] = useState<{name: string, path: string}[]>([]);

    // Fetch root folders on mount
    useEffect(() => {
        fetchFolders('');
    }, []);

    // Update breadcrumbs when path changes
    useEffect(() => {
        if (currentPath === '') {
            setBreadcrumbs([]);
            return;
        }

        const parts = currentPath.split('/').filter(Boolean);
        const crumbs = parts.map((part, index) => {
            const path = parts.slice(0, index + 1).join('/');
            return { name: part, path };
        });

        setBreadcrumbs(crumbs);
    }, [currentPath]);

    // Fetch folders for a given path
    const fetchFolders = async (path: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/s3/list-folders?prefix=${encodeURIComponent(path)}`, {
                headers: {
                    'Authorization': authHeader
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch folders');
            }

            const data = await response.json();

            // Process the folders
            const folders = data.folders.map((folderPath: string) => {
                // Extract folder name from path
                const name = folderPath.split('/').filter(Boolean).pop() || folderPath;

                return {
                    name,
                    path: folderPath,
                    isOpen: false,
                    isLoaded: false,
                    children: []
                };
            });

            if (path === '') {
                // Set root folders
                setRootFolders(folders);
            } else {
                // Update the folder structure
                updateFolderChildren(path, folders);
            }
        } catch (error) {
            console.error('Error fetching folders:', error);
            toast.error('Failed to fetch folders');
        } finally {
            setLoading(false);
        }
    };

    // Update children of a folder in the hierarchy
    const updateFolderChildren = (parentPath: string, children: FolderItem[]) => {
        setRootFolders(prevFolders => {
            const updateChildren = (folders: FolderItem[], path: string): FolderItem[] => {
                return folders.map(folder => {
                    if (folder.path === path) {
                        return {
                            ...folder,
                            children,
                            isLoaded: true
                        };
                    } else if (folder.children && path.startsWith(folder.path)) {
                        return {
                            ...folder,
                            children: updateChildren(folder.children, path)
                        };
                    }
                    return folder;
                });
            };

            return updateChildren(prevFolders, parentPath);
        });
    };

    // Toggle folder expansion
    const toggleFolder = async (folder: FolderItem) => {
        const newState = !folder.isOpen;

        // If opening the folder and it's not loaded yet, fetch its contents
        if (newState && !folder.isLoaded) {
            await fetchFolders(folder.path);
        }

        // Update the folder state
        setRootFolders(prevFolders => {
            const updateOpenState = (folders: FolderItem[]): FolderItem[] => {
                return folders.map(f => {
                    if (f.path === folder.path) {
                        return { ...f, isOpen: newState };
                    } else if (f.children) {
                        return { ...f, children: updateOpenState(f.children) };
                    }
                    return f;
                });
            };

            return updateOpenState(prevFolders);
        });
    };

    // Select a folder
    const selectFolder = (folder: FolderItem) => {
        setCurrentPath(folder.path);
        onSelectFolder(folder.path);
    };

    // Create a new folder
    const createFolder = async () => {
        if (!newFolderName) return;

        const folderPath = currentPath
            ? `${currentPath}${currentPath.endsWith('/') ? '' : '/'}${newFolderName}/`
            : `${newFolderName}/`;

        setLoading(true);
        try {
            const response = await fetch('/api/s3/create-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader
                },
                body: JSON.stringify({ folderPath })
            });

            if (!response.ok) {
                throw new Error('Failed to create folder');
            }

            // Refresh the folder list
            if (currentPath) {
                await fetchFolders(currentPath);
            } else {
                await fetchFolders('');
            }

            toast.success(`Folder "${newFolderName}" created successfully`);
            setNewFolderName('');

            // Select the newly created folder
            onSelectFolder(folderPath);
            setCurrentPath(folderPath);
        } catch (error) {
            console.error('Error creating folder:', error);
            toast.error('Failed to create folder');
        } finally {
            setLoading(false);
        }
    };

    // Navigate to a breadcrumb
    const navigateToBreadcrumb = (path: string) => {
        setCurrentPath(path);
        onSelectFolder(path);
    };

    // Navigate up one level
    const navigateUp = () => {
        if (breadcrumbs.length <= 1) {
            setCurrentPath('');
            onSelectFolder('');
            return;
        }

        const parentPath = breadcrumbs[breadcrumbs.length - 2].path;
        setCurrentPath(parentPath);
        onSelectFolder(parentPath);
    };

    // Refresh current folder
    const refreshCurrent = async () => {
        if (currentPath) {
            await fetchFolders(currentPath);
        } else {
            await fetchFolders('');
        }
    };

    // Render a folder item
    const renderFolder = (folder: FolderItem, level = 0) => {
        return (
            <div key={folder.path} className="select-none">
                <div
                    className={`
            flex items-center gap-2 p-2 rounded-md
            ${level > 0 ? 'ml-6' : ''}
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${currentPath === folder.path ? 'bg-slate-100 dark:bg-slate-800' : ''}
            transition-colors
            cursor-pointer
          `}
                >
          <span
              onClick={() => toggleFolder(folder)}
              className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
          >
            {folder.isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>

                    <span className="text-slate-500">
            <Folder size={18} />
          </span>

                    <div
                        className="flex-grow text-sm"
                        onClick={() => selectFolder(folder)}
                    >
                        {folder.name}
                    </div>
                </div>

                {folder.isOpen && folder.children && (
                    <div className="ml-2">
                        {folder.children.map(child => renderFolder(child, level + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <Card className="border-slate-200 dark:border-slate-700">
            <CardHeader className="flex flex-row items-center justify-between p-4">
                <CardTitle className="text-base">S3 Folders</CardTitle>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={refreshCurrent}
                    disabled={loading}
                    className="h-8 px-2 bg-accent"
                >
                    <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                </Button>
            </CardHeader>

            <CardContent className="p-0">
                {/* Breadcrumb navigation */}
                {breadcrumbs.length > 0 && (
                    <div className="flex items-center px-4 py-2 text-sm border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-x-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={navigateUp}
                            className="h-6 w-6 p-0 mr-2"
                        >
                            <ArrowLeft size={14} />
                        </Button>

                        <div className="flex items-center gap-1 flex-wrap">
              <span
                  className="cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400"
                  onClick={() => {
                      setCurrentPath('');
                      onSelectFolder('');
                  }}
              >
                root
              </span>

                            {breadcrumbs.map((crumb, index) => (
                                <div key={crumb.path} className="flex items-center">
                                    <span className="mx-1 text-slate-400">/</span>
                                    <span
                                        className={`cursor-pointer ${
                                            index === breadcrumbs.length - 1
                                                ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                                                : 'hover:text-indigo-600 dark:hover:text-indigo-400'
                                        }`}
                                        onClick={() => navigateToBreadcrumb(crumb.path)}
                                    >
                    {crumb.name}
                  </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Folder browser */}
                <div className="max-h-64 overflow-y-auto p-2">
                    {loading && rootFolders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                            <RefreshCw size={20} className="animate-spin mx-auto mb-2" />
                            Loading folders...
                        </div>
                    ) : rootFolders.length === 0 ? (
                        <div className="p-4 text-center text-slate-500">
                            No folders found
                        </div>
                    ) : (
                        <div className="divide-y dark:divide-slate-700">
                            {rootFolders.map(folder => renderFolder(folder))}
                        </div>
                    )}
                </div>

                {/* Create folder */}
                {allowCreateFolder && (
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex gap-2">
                            <Input
                                value={newFolderName}
                                onChange={(e) => setNewFolderName(e.target.value)}
                                placeholder="New folder name"
                                className="h-9"
                            />
                            <Button
                                onClick={createFolder}
                                disabled={!newFolderName || loading}
                                className="h-9"
                            >
                                <FolderPlus size={16} className="mr-2" />
                                Create
                            </Button>
                        </div>

                        {currentPath && (
                            <div className="mt-2 text-xs text-slate-500">
                                Will create: {currentPath}{currentPath.endsWith('/') ? '' : '/'}{newFolderName}
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default S3FolderBrowser;