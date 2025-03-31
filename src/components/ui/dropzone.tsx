import React, { useState, useRef } from 'react';
import { Upload, X, File, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DropzoneProps {
    onFilesAdded: (files: File[]) => void;
    maxFiles?: number;
    maxSize?: number; // in bytes
    accept?: string;
    className?: string;
}

export function Dropzone({
                             onFilesAdded,
                             maxFiles = 10,
                             maxSize = 5 * 1024 * 1024, // 5MB default
                             accept = 'image/*',
                             className = '',
                         }: DropzoneProps) {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileRejections, setFileRejections] = useState<string[]>([]);
    const [success, setSuccess] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const validateFiles = (files: File[]): { valid: File[]; rejections: string[] } => {
        const validFiles: File[] = [];
        const rejections: string[] = [];

        Array.from(files).forEach((file) => {
            // Check file type
            if (accept && !file.type.match(accept.replace(/\*/g, '.*'))) {
                rejections.push(`${file.name} has an invalid file type`);
                return;
            }

            // Check file size
            if (file.size > maxSize) {
                rejections.push(`${file.name} exceeds the maximum file size of ${maxSize / 1024 / 1024}MB`);
                return;
            }

            validFiles.push(file);
        });

        // Check max files
        if (validFiles.length > maxFiles) {
            rejections.push(`Only ${maxFiles} files can be uploaded at once`);
            validFiles.splice(maxFiles);
        }

        return { valid: validFiles, rejections };
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const { valid, rejections } = validateFiles(Array.from(e.dataTransfer.files));
            setFileRejections(rejections);

            if (valid.length > 0) {
                onFilesAdded(valid);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2000);
            }
        }
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const { valid, rejections } = validateFiles(Array.from(e.target.files));
            setFileRejections(rejections);

            if (valid.length > 0) {
                onFilesAdded(valid);
                setSuccess(true);
                setTimeout(() => setSuccess(false), 2000);
            }
        }
    };

    const handleButtonClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    return (
        <div className="space-y-4">
            <div
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`
          border-2 ${isDragging ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-dashed border-slate-300 dark:border-slate-700'}
          rounded-lg p-8 flex flex-col items-center justify-center
          cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50
          transition-all
          ${className}
        `}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={accept}
                    onChange={handleFileInputChange}
                    className="hidden"
                />

                {success ? (
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                            <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <p className="text-base font-medium text-green-600 dark:text-green-400">Files added successfully</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center">
                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                            <Upload className="h-6 w-6 text-slate-500 dark:text-slate-400" />
                        </div>
                        <p className="mb-2 text-base font-medium text-slate-700 dark:text-slate-300">
                            Drag & drop files here
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                            or click to browse
                        </p>
                        <Button variant="outline" onClick={handleButtonClick}>
                            <Upload size={16} className="mr-2" />
                            Select Files
                        </Button>
                    </div>
                )}
            </div>

            {fileRejections.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <X className="h-5 w-5 text-red-400" />
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                                There were errors with your upload
                            </h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                <ul className="list-disc pl-5 space-y-1">
                                    {fileRejections.map((message, index) => (
                                        <li key={index}>{message}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}