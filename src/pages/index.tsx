import { useRouter } from 'next/router';
import Layout from '@/components/layout/layout';
import CameraCapture from '@/components/capture/CameraCapture';
import { Card, CardContent } from '@/components/ui/card';

export default function Home() {
  const router = useRouter();

  const handleCapture = (imageSrc: string) => {
    if (imageSrc) {
      // Store the original image in localStorage
      localStorage.setItem('faceRecog_originalImage', imageSrc);

      // Navigate to crop page - first try router for SPA experience
      try {
        router.push({
          pathname: '/crop'
        });
      } catch (error) {
        // Fallback to direct navigation if router fails
        window.location.href = '/crop';
      }
    }
  };

  return (
      <Layout>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mx-auto">
          <CameraCapture onCapture={handleCapture} />

          <div>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-4 text-center">How it works</h2>
                <div className="flex flex-col gap-4 text-center">
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-semibold">1</span>
                    </div>
                    <div className="text-sm font-medium">Capture</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Take a photo or upload</div>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-semibold">2</span>
                    </div>
                    <div className="text-sm font-medium">Search</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select folders to search</div>
                  </div>
                  <div className="p-4 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-semibold">3</span>
                    </div>
                    <div className="text-sm font-medium">Match</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">View matching results</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </Layout>
  );
}