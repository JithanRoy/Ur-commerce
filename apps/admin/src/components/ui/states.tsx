import { AlertCircle, Inbox } from "lucide-react";
import { LoadingRegion, Skeleton, SkeletonText } from "./skeleton";

type LoadingVariant = "table" | "form" | "detail" | "panels" | "block";

function TableSkeleton({ rows }: { rows: number }) {
  return (
    <div className="overflow-hidden rounded-xl border">
      <div className="flex items-center gap-6 border-b bg-muted/40 px-4 py-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="ml-auto h-3 w-12" />
      </div>
      {Array.from({ length: rows }, (_, index) => (
        <div
          key={index}
          className="flex items-center gap-4 border-b px-4 py-3 last:border-0"
        >
          <Skeleton className="size-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-1/4" />
          </div>
          <Skeleton className="hidden h-6 w-16 rounded-full sm:block" />
          <Skeleton className="h-3.5 w-14" />
        </div>
      ))}
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5">
      {[3, 2].map((fields, section) => (
        <div key={section} className="rounded-xl border p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56 max-w-full" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: fields }, (_, index) => (
              <FieldSkeleton key={index} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-5">
        <div className="rounded-xl border p-5">
          <Skeleton className="mb-4 h-4 w-28" />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-4 py-3">
              <Skeleton className="size-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-3.5 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-5">
          <SkeletonText lines={3} />
        </div>
      </div>
      <div className="space-y-5">
        <div className="rounded-xl border p-5">
          <Skeleton className="mb-4 h-4 w-20" />
          <SkeletonText lines={4} />
        </div>
      </div>
    </div>
  );
}

function PanelsSkeleton({ rows }: { rows: number }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {[0, 1].map((panel) => (
        <div key={panel} className="rounded-xl border p-5">
          <Skeleton className="mb-4 h-4 w-32" />
          <div className="space-y-2">
            {Array.from({ length: rows }, (_, index) => (
              <Skeleton key={index} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function BlockSkeleton() {
  return (
    <div className="rounded-xl border p-6">
      <SkeletonText lines={4} />
    </div>
  );
}

export function LoadingState({
  variant = "block",
  rows = 6,
  label,
}: {
  variant?: LoadingVariant;
  rows?: number;
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      {variant === "table" ? <TableSkeleton rows={rows} /> : null}
      {variant === "form" ? <FormSkeleton /> : null}
      {variant === "detail" ? <DetailSkeleton /> : null}
      {variant === "panels" ? <PanelsSkeleton rows={rows} /> : null}
      {variant === "block" ? <BlockSkeleton /> : null}
    </LoadingRegion>
  );
}

export function PageSkeleton() {
  return (
    <LoadingRegion label="Loading page">
      <div className="mb-8 space-y-2.5">
        <Skeleton className="h-7 w-44" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <TableSkeleton rows={6} />
    </LoadingRegion>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-destructive/40 bg-destructive/5 px-6 py-12 text-center"
    >
      <AlertCircle className="mx-auto size-8 text-destructive/70" aria-hidden />
      <p className="mt-3 text-sm font-medium text-destructive">{message}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed px-6 py-16 text-center">
      <Inbox className="mx-auto size-8 text-muted-foreground/50" aria-hidden />
      <p className="mt-3 font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
