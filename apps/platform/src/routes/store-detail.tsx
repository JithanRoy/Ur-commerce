import { Link, useParams } from "react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import type { PlatformStore } from "@urcommerce/api-client";
import { useStore } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/features/stores/status-badge";
import { StatusPanel } from "@/features/stores/status-panel";
import { StoreDetailsCard } from "@/features/stores/store-details-card";
import { StorePeople } from "@/features/stores/store-people";
import { adminUrl, storefrontUrl } from "@/lib/store-urls";

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
        <div className="flex min-w-0 flex-col gap-6">
          <StoreDetailsCard store={store} />
          <StorePeople store={store} />
        </div>
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
