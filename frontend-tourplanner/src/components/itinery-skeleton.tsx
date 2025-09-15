import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function ItinerarySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start w-full max-w-6xl ml-4 lg:ml-26 mr-2 container p-2 mx-auto">
      <div className="lg:col-span-2 space-y-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-slate-300 dark:border-slate-600">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
              <Skeleton className="h-8 w-1/4 bg-slate-300 dark:bg-slate-600 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-4 bg-slate-25 dark:bg-slate-800/30">
              <div className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full mt-1 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                  <Skeleton className="h-4 w-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
                  <Skeleton className="h-4 w-3/4 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                </div>
              </div>
               <div className="flex items-start gap-4">
                <Skeleton className="h-8 w-8 rounded-full mt-1 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/3 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                  <Skeleton className="h-4 w-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
                  <Skeleton className="h-4 w-3/4 bg-slate-300 dark:bg-slate-600 animate-pulse" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="lg:col-span-1 space-y-6 sticky top-24">
        <Card className="animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-slate-300 dark:border-slate-600">
          <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
            <Skeleton className="h-7 w-1/2 bg-slate-300 dark:bg-slate-600 animate-pulse" />
          </CardHeader>
          <CardContent className="space-y-4 bg-slate-25 dark:bg-slate-800/30">
            <Skeleton className="h-5 w-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
            <Skeleton className="h-5 w-3/4 bg-slate-300 dark:bg-slate-600 animate-pulse" />
            <Skeleton className="h-10 w-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
          </CardContent>
        </Card>
        <Card className="animate-pulse bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 dark:from-slate-800 dark:via-slate-700 dark:to-slate-800 border-slate-300 dark:border-slate-600">
            <CardHeader className="bg-slate-50 dark:bg-slate-900/50">
                <Skeleton className="h-7 w-2/3 bg-slate-300 dark:bg-slate-600 animate-pulse" />
            </CardHeader>
            <CardContent className="bg-slate-25 dark:bg-slate-800/30">
                <Skeleton className="w-full h-48 bg-slate-300 dark:bg-slate-600 animate-pulse" />
            </CardContent>
        </Card>
      </div>
    </div>
  );
}
