import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

interface LoadingSkeletonProps {
    type?: 'default' | 'result' | 'history' | 'detail';
}

export default function LoadingSkeleton({ type = 'default' }: LoadingSkeletonProps) {
    if (type === 'result') {
        return (
            <div className="grid md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="space-y-4">
                                <Skeleton className="h-48 w-full rounded-md" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-1/2" />
                                <div className="pt-4">
                                    <Skeleton className="h-8 w-full" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                <div className="md:col-span-2">
                    <Card className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-6">
                            <div className="space-y-6">
                                <div className="flex gap-4 items-center">
                                    <Skeleton className="h-16 w-16 rounded-full" />
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-3/4" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (type === 'history') {
        return (
            <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="border-slate-200 dark:border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                                <div className="flex-grow space-y-2">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-48" />
                                    <div className="pt-2 flex gap-2">
                                        <Skeleton className="h-8 w-24" />
                                        <Skeleton className="h-8 w-24" />
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (type === 'detail') {
        return (
            <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3">
                            <Skeleton className="aspect-square rounded-lg mb-4" />
                            <Skeleton className="h-3 w-full mb-2" />
                            <Skeleton className="h-2 w-3/4" />
                        </div>
                        <div className="w-full md:w-2/3 space-y-4">
                            <Skeleton className="h-8 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <div className="space-y-2 pt-4">
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-3/4" />
                                <Skeleton className="h-3 w-full" />
                                <Skeleton className="h-3 w-1/2" />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Default
    return (
        <div className="max-w-md mx-auto">
            <Card className="border-slate-200 dark:border-slate-700">
                <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-4 w-3/4 mx-auto" />
                    <Skeleton className="h-48 w-full rounded-md" />
                    <Skeleton className="h-8 w-full" />
                </CardContent>
            </Card>
        </div>
    );
}