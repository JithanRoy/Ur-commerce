import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import type { PlatformStore } from "@urcommerce/api-client";
import { useStore } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { formatDateTime } from "@/features/stores/date";
import { StatusBadge } from "@/features/stores/status-badge";
import { StatusPanel } from "@/features/stores/status-panel";
import { adminUrl, displayHost, storefrontUrl } from "@/lib/store-urls";

function Detail({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="break-all text-sm">{children}</dd>
    </div>
  );
}

function ExternalAnchor({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
    >
      {displayHost(href)}
      <ExternalLink className="size-3.5" aria-hidden />
    </a>
  );
}

function StoreDetail({ store }: { store: PlatformStore }) {
  const open = store.status !== "CANCELLED";
  return (
    <>
      <header className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold tracking-tight">{store.name}</h1>
        <StatusBadge status={store.status} />
        {open ? (
          <div className="ml-auto flex gap-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              trailing={<ExternalLink aria-hidden />}
            >
              <a
                href={storefrontUrl(store.subdomain)}
                target="_blank"
                rel="noreferrer"
              >
                Storefront
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              trailing={<ExternalLink aria-hidden />}
            >
              <a
                href={adminUrl(store.subdomain)}
                target="_blank"
                rel="noreferrer"
              >
                Admin
              </a>
            </Button>
          </div>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section
          aria-label="Store details"
          className="rounded-xl border bg-card px-6 py-3"
        >
          <dl className="divide-y">
            <Detail label="Subdomain">{store.subdomain}</Detail>
            <Detail label="Storefront">
              <ExternalAnchor href={storefrontUrl(store.subdomain)} />
            </Detail>
            <Detail label="Admin">
              <ExternalAnchor href={adminUrl(store.subdomain)} />
            </Detail>
            <Detail label="Custom domain">
              {store.customDomain ?? "None"}
            </Detail>
            <Detail label="Currency">{store.currency}</Detail>
            <Detail label="Locale">{store.locale}</Detail>
            <Detail label="Time zone">{store.timezone}</Detail>
            <Detail label="Created">{formatDateTime(store.createdAt)}</Detail>
            <Detail label="Last changed">
              {formatDateTime(store.updatedAt)}
            </Detail>
            <Detail label="Store ID">
              <code className="text-xs">{store.id}</code>
            </Detail>
          </dl>
        </section>
        <div className="lg:sticky lg:top-20 lg:self-start">
          <StatusPanel store={store} />
        </div>
      </div>
    </>
  );
}

export function StoreDetailRoute() {
  const { storeId = "" } = useParams();
  const { data, isPending, error } = useStore(storeId);

  return (
    <>
      <Link
        to="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Stores
      </Link>
      {isPending ? (
        <LoadingState variant="detail" label="Loading store" />
      ) : error || !data ? (
        <ErrorState
          message={
            isApiError(error) && (error.isNotFound || error.status === 400)
              ? "That store doesn't exist."
              : "We could not load this store."
          }
        />
      ) : (
        <StoreDetail store={data} />
      )}
    </>
  );
}
