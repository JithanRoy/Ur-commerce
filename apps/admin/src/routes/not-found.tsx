import { Link } from "react-router";
import { FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

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
      <Button asChild className="mt-6">
        <Link to="/products">Go to Products</Link>
      </Button>
    </div>
  );
}
