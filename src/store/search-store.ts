import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface SearchResult {
    id: string;
    name: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    imageSrc: string;
    matchConfidence: number;
    details: {
        path: string;
        additionalInfo?: string;
        title?: string;
        department?: string;
        email?: string;
        phone?: string;
        [key: string]: unknown;
    };
}

export interface SearchRecord {
    id: string;
    imageSrc: string;
    folder: string;
    includeSubfolders: boolean;
    timestamp: string;
    results: SearchResult[];
}

interface SearchState {
    currentImage: string | null;
    searchHistory: SearchRecord[];
    setCurrentImage: (image: string) => void;
    addSearchRecord: (record: Omit<SearchRecord, 'id' | 'timestamp'> & { id?: string, timestamp?: string }) => void;
    removeSearchRecord: (id: string) => void;
    clearHistory: () => void;
}

export const useSearchStore = create<SearchState>()(
    persist(
        (set) => ({
            currentImage: null,
            searchHistory: [],
            setCurrentImage: (image) => set({ currentImage: image }),
            addSearchRecord: (record) => set((state) => {
                const newRecord: SearchRecord = {
                    id: record.id || Date.now().toString(),
                    timestamp: record.timestamp || new Date().toISOString(),
                    imageSrc: record.imageSrc,
                    folder: record.folder,
                    includeSubfolders: record.includeSubfolders || false, // Default to false if not provided
                    results: record.results,
                };

                // Make sure we don't add duplicates
                const existingIndex = state.searchHistory.findIndex(r =>
                    r.imageSrc === newRecord.imageSrc && r.folder === newRecord.folder
                );

                let updatedHistory;
                if (existingIndex >= 0) {
                    // Replace existing record
                    updatedHistory = [...state.searchHistory];
                    updatedHistory[existingIndex] = newRecord;
                } else {
                    // Add new record at the beginning
                    updatedHistory = [newRecord, ...state.searchHistory];
                }

                // Keep only the latest 10 search records
                if (updatedHistory.length > 10) {
                    updatedHistory = updatedHistory.slice(0, 10);
                }

                return { searchHistory: updatedHistory };
            }),
            removeSearchRecord: (id) => set((state) => ({
                searchHistory: state.searchHistory.filter((record) => record.id !== id)
            })),
            clearHistory: () => set({ searchHistory: [] }),
        }),
        {
            name: 'face-recognition-storage',
        }
    )
);