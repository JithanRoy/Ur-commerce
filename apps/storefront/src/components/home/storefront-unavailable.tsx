import { CloudOff } from "lucide-react";

export function StorefrontUnavailable() {
  return (
    <section className="container-page py-24">
      <div className="mx-auto max-w-md rounded-xl border border-dashed px-8 py-16 text-center">
        <CloudOff
          className="mx-auto size-10 text-muted-foreground/50"
          aria-hidden
        />
        <h2 className="mt-5 font-display text-xl font-semibold">
          We could not load the store
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our side. Please refresh in a moment.
        </p>
      </div>
    </section>
  );
}
