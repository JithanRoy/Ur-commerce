"use client";

import { LoadingRegion, Skeleton, SkeletonText } from "./skeleton";

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card">
      <Skeleton className="aspect-4/5 rounded-none" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Skeleton className="h-2.5 w-16" />
        <Skeleton className="h-3.5 w-4/5" />
        <Skeleton className="h-4 w-20" />
        <div className="mt-auto flex gap-2 pt-3">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({
  count = 6,
  withFilters = true,
}: {
  count?: number;
  withFilters?: boolean;
}) {
  return (
    <div
      className={
        withFilters ? "grid gap-10 lg:grid-cols-[200px_1fr]" : undefined
      }
    >
      {withFilters ? (
        <div className="hidden space-y-6 lg:block">
          {[5, 4].map((items, group) => (
            <div key={group} className="space-y-3">
              <Skeleton className="h-3.5 w-20" />
              {Array.from({ length: items }, (_, index) => (
                <Skeleton key={index} className="h-3 w-32" />
              ))}
            </div>
          ))}
        </div>
      ) : null}
      <div className="min-w-0">
        <div className="mb-6 flex gap-2">
          {[64, 80, 72, 88].map((width) => (
            <Skeleton
              key={width}
              className="h-8 rounded-full"
              style={{ width }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
          {Array.from({ length: count }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function CatalogueSkeleton({ label = "Loading products" }) {
  return (
    <LoadingRegion label={label} className="container-page py-10">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-3.5 w-24" />
      </div>
      <ProductGridSkeleton />
    </LoadingRegion>
  );
}

export function ProductDetailSkeleton() {
  return (
    <LoadingRegion label="Loading product" className="container-page py-10">
      <div className="mb-8 flex gap-2">
        <Skeleton className="h-3.5 w-12" />
        <Skeleton className="h-3.5 w-20" />
        <Skeleton className="h-3.5 w-32" />
      </div>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:gap-14">
        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <div className="flex gap-2 sm:w-16 sm:flex-col">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton
                key={index}
                className="aspect-square w-16 shrink-0 rounded-lg"
              />
            ))}
          </div>
          <Skeleton className="aspect-4/5 flex-1 rounded-xl" />
        </div>
        <div className="space-y-6">
          <div className="space-y-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-9 w-4/5" />
            <Skeleton className="h-7 w-32" />
          </div>
          <SkeletonText lines={3} />
          <div className="space-y-3">
            <Skeleton className="h-3.5 w-14" />
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-10 w-14 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-12 w-32 rounded-lg" />
            <Skeleton className="h-12 flex-1 rounded-lg" />
          </div>
          <Skeleton className="h-12 w-full rounded-lg" />
        </div>
      </div>
    </LoadingRegion>
  );
}

function LineItemSkeleton() {
  return (
    <div className="flex gap-4 border-b py-5 last:border-0">
      <Skeleton className="h-24 w-20 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-3/5" />
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-auto h-9 w-28 rounded-lg" />
      </div>
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

function SummarySkeleton() {
  return (
    <div className="h-fit space-y-4 rounded-xl border p-6">
      <Skeleton className="h-5 w-28" />
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex justify-between">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-3.5 w-16" />
        </div>
      ))}
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  );
}

export function CartSkeleton({ label = "Loading your cart" }) {
  return (
    <LoadingRegion label={label}>
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div>
          {Array.from({ length: 3 }, (_, index) => (
            <LineItemSkeleton key={index} />
          ))}
        </div>
        <SummarySkeleton />
      </div>
    </LoadingRegion>
  );
}

export function CheckoutSkeleton() {
  return (
    <LoadingRegion label="Loading checkout">
      <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {[2, 1].map((cards, section) => (
            <div key={section} className="space-y-3">
              <Skeleton className="h-5 w-40" />
              {Array.from({ length: cards }, (_, index) => (
                <Skeleton key={index} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ))}
        </div>
        <SummarySkeleton />
      </div>
    </LoadingRegion>
  );
}

export function ListSkeleton({
  rows = 4,
  label = "Loading",
}: {
  rows?: number;
  label?: string;
}) {
  return (
    <LoadingRegion label={label}>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 rounded-xl border p-5"
          >
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-64 max-w-full" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function TileGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <LoadingRegion label="Loading" className="container-page py-10">
      <Skeleton className="mb-8 h-8 w-40" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: count }, (_, index) => (
          <Skeleton key={index} className="aspect-3/2 rounded-xl" />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function PageSkeleton() {
  return (
    <LoadingRegion label="Loading page" className="container-page py-10">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AuthFormSkeleton() {
  return (
    <LoadingRegion
      label="Loading"
      className="container-page flex min-h-[60vh] items-center justify-center py-14"
    >
      <div className="w-full max-w-sm space-y-5">
        <Skeleton className="mx-auto h-8 w-40" />
        {Array.from({ length: 2 }, (_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-3.5 w-16" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        ))}
        <Skeleton className="h-11 w-full rounded-lg" />
      </div>
    </LoadingRegion>
  );
}
