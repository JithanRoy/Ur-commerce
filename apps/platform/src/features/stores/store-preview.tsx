import type { StoreStatus } from "@urcommerce/api-client";
import { adminUrl, displayHost, storefrontUrl } from "@/lib/store-urls";
import { StatusBadge } from "./status-badge";
import { StoreMark } from "./store-mark";

function Line({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate font-mono text-sm">
        {value ?? (
          <span className="font-sans text-muted-foreground/60">
            Not set yet
          </span>
        )}
      </dd>
    </div>
  );
}

export function StorePreview({
  name,
  subdomain,
  status,
  ownerEmail,
}: {
  name: string;
  subdomain: string;
  status: StoreStatus;
  ownerEmail: string;
}) {
  const shownName = name.trim() || "New store";
  const address = subdomain.trim().toLowerCase();

  return (
    <aside
      aria-label="What the owner gets"
      className="rounded-xl border bg-card p-5 lg:sticky lg:top-20"
    >
      <p className="text-sm font-medium text-muted-foreground">
        What the owner gets
      </p>
      <div className="mt-4 flex items-center gap-3">
        <StoreMark
          name={shownName}
          subdomain={address || shownName}
          size="lg"
        />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold tracking-tight">
            {shownName}
          </p>
          <StatusBadge status={status} className="mt-1" />
        </div>
      </div>
      <dl className="mt-4 divide-y border-t">
        <Line
          label="Shop"
          value={address ? displayHost(storefrontUrl(address)) : null}
        />
        <Line
          label="Admin"
          value={address ? displayHost(adminUrl(address)) : null}
        />
        <Line label="Signs in as" value={ownerEmail.trim() || null} />
      </dl>
    </aside>
  );
}
