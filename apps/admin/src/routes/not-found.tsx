import { Link } from "react-router";
import { FileQuestion } from "lucide-react";

export function NotFoundRoute() {
  return (
    <div className="rounded-lg border border-dashed px-6 py-20 text-center">
      <FileQuestion
        className="mx-auto size-10 text-muted-foreground/50"
        aria-hidden
      />
      <h1 className="mt-5 text-lg font-semibold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        That page does not exist in the admin panel.
      </p>
      <Link
        to="/products"
        className="mt-6 inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Go to Products
      </Link>
    </div>
  );
}
