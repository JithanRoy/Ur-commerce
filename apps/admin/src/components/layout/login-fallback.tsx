import { Skeleton, LoadingRegion } from "@/components/ui/skeleton";

function FieldPlaceholder() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-16" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  );
}

export function LoginFallback() {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <section aria-hidden className="hidden bg-sidebar lg:block" />
      <section className="flex items-center justify-center px-6 py-12">
        <LoadingRegion label="Loading sign in" className="w-full max-w-sm">
          <div className="mb-8 space-y-2.5">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-3.5 w-56" />
          </div>
          <div className="space-y-4">
            <FieldPlaceholder />
            <FieldPlaceholder />
          </div>
          <Skeleton className="mt-9 h-11 w-full rounded-lg" />
        </LoadingRegion>
      </section>
    </main>
  );
}
