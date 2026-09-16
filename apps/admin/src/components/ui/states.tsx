import { AlertCircle, Inbox } from "lucide-react";

export function LoadingState() {
  return (
    <div className="rounded-lg border px-6 py-16 text-center">
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
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
