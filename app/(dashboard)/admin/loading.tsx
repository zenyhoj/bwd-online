import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="border-none shadow-none bg-muted/20">
            <CardContent className="p-8">
              <div className="flex items-start justify-between">
                <div className="space-y-4">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-12 w-16" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-10 w-10 rounded-full" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-11 w-full rounded-full" />
            <Skeleton className="h-11 w-24 rounded-md" />
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/80">
            <div className="border-b border-border/80 px-4 py-4">
              <Skeleton className="h-5 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <Skeleton className="h-10 w-48" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
