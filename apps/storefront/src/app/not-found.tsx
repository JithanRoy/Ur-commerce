import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        We could not find what you were looking for.
      </p>
      <Link
        href="/shop"
        className="mt-6 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm font-medium text-primary-foreground"
      >
        Continue shopping
      </Link>
    </div>
  );
}
