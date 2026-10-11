import { Link } from "react-router";
import { CheckCircle2, ExternalLink } from "lucide-react";
import type { PlatformStore } from "@urcommerce/api-client";
import { Button } from "@/components/ui/button";
import { adminUrl, storefrontUrl } from "@/lib/store-urls";
import { CopyButton } from "./copy-button";

export type OwnerCredentials = {
  name: string;
  email: string;
  password: string;
};

function handoverText(store: PlatformStore, owner: OwnerCredentials): string {
  return [
    `Your store "${store.name}" is ready.`,
    `Admin: ${adminUrl(store.subdomain)}`,
    `Shop: ${storefrontUrl(store.subdomain)}`,
    `Email: ${owner.email}`,
    `Temporary password: ${owner.password}`,
    "Please change the password after your first sign-in.",
  ].join("\n");
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-2.5 sm:grid-cols-[9rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all font-mono text-sm">{value}</dd>
    </div>
  );
}

export function StoreHandover({
  store,
  owner,
  onCreateAnother,
}: {
  store: PlatformStore;
  owner: OwnerCredentials;
  onCreateAnother: () => void;
}) {
  return (
    <section
      aria-labelledby="handover-title"
      className="max-w-2xl rounded-xl border bg-card p-6"
    >
      <div className="flex items-start gap-3">
        <CheckCircle2
          className="mt-0.5 size-6 shrink-0 text-success"
          aria-hidden
        />
        <div>
          <h2 id="handover-title" className="text-lg font-semibold">
            {store.name} is ready
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            There is no invitation email. Send these details to {owner.name}{" "}
            yourself. The password is shown only now.
          </p>
        </div>
      </div>

      <dl className="mt-5 divide-y rounded-lg border px-4">
        <Row label="Admin" value={adminUrl(store.subdomain)} />
        <Row label="Shop" value={storefrontUrl(store.subdomain)} />
        <Row label="Owner email" value={owner.email} />
        <Row label="Password" value={owner.password} />
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <CopyButton
          text={handoverText(store, owner)}
          label="Copy sign-in details"
        />
        <Button
          asChild
          variant="outline"
          size="sm"
          trailing={<ExternalLink aria-hidden />}
        >
          <a href={adminUrl(store.subdomain)} target="_blank" rel="noreferrer">
            Open admin
          </a>
        </Button>
      </div>

      <div className="mt-6 flex flex-wrap gap-2 border-t pt-5">
        <Button asChild>
          <Link to={`/stores/${store.id}`}>View store</Link>
        </Button>
        <Button variant="outline" onClick={onCreateAnother}>
          Create another store
        </Button>
        <Button asChild variant="ghost">
          <Link to="/">Back to stores</Link>
        </Button>
      </div>
    </section>
  );
}
