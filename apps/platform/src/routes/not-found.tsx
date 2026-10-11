import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/states";

export function NotFoundRoute() {
  return (
    <EmptyState
      title="Page not found"
      description="That page doesn't exist in the platform console."
      action={
        <Button asChild variant="outline">
          <Link to="/">Back to stores</Link>
        </Button>
      }
    />
  );
}
