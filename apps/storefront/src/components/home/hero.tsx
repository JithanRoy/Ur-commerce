import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function Hero({ storeName }: { storeName: string }) {
  return (
    <section className="border-b bg-linear-to-b from-accent/40 to-background">
      <div className="container-page py-20 sm:py-28">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
            {storeName}
          </p>
          <h1 className="mt-4 text-balance font-display text-4xl font-semibold leading-[1.1] sm:text-5xl lg:text-6xl">
            Everyday pieces, made to be worn.
          </h1>
          <p className="mt-5 max-w-md text-pretty text-muted-foreground">
            Cash on delivery across Bangladesh. Free shipping on orders over
            ৳2,000.
          </p>
          <Link
            href="/shop"
            className="group mt-8 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            Shop the collection
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
