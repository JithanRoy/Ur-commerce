import { PackageOpen } from "lucide-react";

export function EmptyStorefront() {
  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-md rounded-xl border border-dashed px-8 py-16 text-center">
        <PackageOpen
          className="mx-auto size-10 text-muted-foreground/50"
          aria-hidden
        />
        <h2 className="mt-5 font-display text-xl font-semibold">
          The shelves are still being stocked
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          This store has not published any products yet. Please check back soon.
        </p>
      </div>
    </section>
  );
}
