import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[50vh] flex-col items-center justify-center text-center">
      <h1 className="font-display text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-muted-foreground">
        We could not find what you were looking for.
      </p>
      <Button asChild shape="pill" className="mt-6 px-6">
        <Link href="/shop">Continue shopping</Link>
      </Button>
    </div>
  );
}
