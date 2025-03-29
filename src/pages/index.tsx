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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (error) {
        // Fallback to direct navigation if router fails
        window.location.href = '/crop';
      }
    }
  };

  return (
      <Layout>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-2">
          <CameraCapture onCapture={handleCapture} />
          </div>

          <div className="flex-1">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="p-[10px]">
                <h2 className="text-lg font-semibold mb-2 text-center">How it works</h2>
                <div className="flex flex-col gap-2 text-center">
                  <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-semibold">1</span>
                    </div>
                    <div className="text-sm font-medium">Capture</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Take a photo or upload</div>
                  </div>
                  <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-lg font-semibold">2</span>
                    </div>
                    <div className="text-sm font-medium">Search</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Select folders to search</div>
                  </div>
                  <div className="p-2 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-800/50">
                    <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto mb-2">
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