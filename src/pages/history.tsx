import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Layout from '@/components/layout/layout';
import LoadingSkeleton from '@/components/loading';
import { useSearchStore } from '@/store/search-store';
import { SearchRecord } from '@/store/search-store';
import { formatDistanceToNow } from 'date-fns';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export default function HistoryPage() {
    const router = useRouter();
    const { searchHistory, clearHistory, removeSearchRecord } = useSearchStore();
    const [expandedRecord, setExpandedRecord] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Simulate loading state - in a real app, this would be tied to data fetching
    useEffect(() => {
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
    }, []);

    const handleViewDetails = (record: SearchRecord) => {
        setIsLoading(true); // Show loading state when navigating
        router.push({
            pathname: '/results',
            query: {
                image: record.imageSrc,
                folders: JSON.stringify([record.folder]),
                fromHistory: true
            }
        });
    };

    const toggleExpand = (id: string) => {
        if (expandedRecord === id) {
            setExpandedRecord(null);
        } else {
            setExpandedRecord(id);
        }
    };

    const handleRemoveRecord = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent expansion toggle
        removeSearchRecord(id);
    };

    const getConfidenceLevelColor = (confidence: number): string => {
        if (confidence >= 95) return 'bg-green-500 dark:bg-green-600';
        if (confidence >= 80) return 'bg-emerald-500 dark:bg-emerald-600';
        if (confidence >= 70) return 'bg-blue-500 dark:bg-blue-600';
        if (confidence >= 60) return 'bg-yellow-500 dark:bg-yellow-600';
        return 'bg-slate-500 dark:bg-slate-600';
    };

    if (isLoading) {
        return (
            <Layout title="Search History" showNewSearch={true}>
                <LoadingSkeleton type="history" />
            </Layout>
        );
    }

    return (
        <Layout title="Search History" showNewSearch={true}>
            <div className="mb-6 flex justify-between items-center">
                <p className="text-muted-foreground">
                    {searchHistory.length > 0
                        ? `${searchHistory.length} previous ${searchHistory.length === 1 ? 'search' : 'searches'}`
                        : 'No search history yet'}
                </p>

                {searchHistory.length > 0 && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearHistory}
                        className="text-destructive border-destructive/20 bg-accent hover:bg-destructive/10"
                    >
                        <Trash2 size={16} className="mr-2" />
                        Clear History
                    </Button>
                )}
            </div>

            {searchHistory.length === 0 ? (
                <Card>
                    <CardContent className="p-8 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Search History</h2>
                        <p className="text-muted-foreground mb-6">
                            Your search history will appear here once you perform searches.
                        </p>
                        <Button
                            onClick={() => router.push('/')}
                            className="bg-primary hover:bg-primary/90"
                        >
                            Start a Search
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {searchHistory.map((record) => (
                        <Card
                            key={record.id}
                            className="overflow-hidden transition-shadow hover:shadow-md"
                        >
                            <CardHeader className="p-4 pb-0">
                                <CardTitle className="text-md flex justify-between items-center">
                  <span className="text-base font-medium">
                    {formatDistanceToNow(new Date(record.timestamp), { addSuffix: true })}
                  </span>
                                    <Badge variant="outline">
                                        {record.results.length} {record.results.length === 1 ? 'match' : 'matches'}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <div
                                    className="flex gap-4 items-center cursor-pointer"
                                    onClick={() => toggleExpand(record.id)}
                                >
                                    <div className="w-16 h-16 rounded-full overflow-hidden bg-muted flex-shrink-0 border-2 border-primary/10">
                                        <img
                                            src={record.imageSrc}
                                            alt="Search"
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-grow">
                                        <p className="text-sm">
                                            <span className="font-medium">Folder:</span> {record.folder}
                                        </p>
                                        {record.results.length > 0 ? (
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleViewDetails(record);
                                                    }}
                                                    className="bg-primary hover:bg-primary/90"
                                                >
                                                    View Results
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleExpand(record.id);
                                                    }}
                                                    className="flex items-center gap-1 bg-white"
                                                >
                                                    {expandedRecord === record.id ? (
                                                        <>Hide Matches <ChevronUp size={16} /></>
                                                    ) : (
                                                        <>Show Matches <ChevronDown size={16} /></>
                                                    )}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => handleRemoveRecord(record.id, e)}
                                                    className="text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 size={16} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-muted-foreground mt-2">
                                                No matches found
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {expandedRecord === record.id && record.results.length > 0 && (
                                    <div className="mt-4 pt-4 border-t">
                                        <h3 className="text-sm font-medium mb-2">Matches</h3>
                                        <div className="space-y-2">
                                            {record.results.map(result => (
                                                <div key={result.id} className="flex items-center gap-3 bg-muted/50 p-2 rounded-md">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden bg-muted flex-shrink-0">
                                                        <img
                                                            src={result.imageSrc}
                                                            alt={result.name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                    <div className="flex-grow">
                                                        <p className="text-sm font-medium">{result.name}</p>
                                                        <p className="text-xs text-muted-foreground">{result.details.path}</p>
                                                    </div>
                                                    <Badge
                                                        className={`${getConfidenceLevelColor(result.matchConfidence)} text-white`}
                                                    >
                                                        {result.matchConfidence.toFixed(1)}%
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </Layout>
    );
}