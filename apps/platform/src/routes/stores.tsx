import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ExternalLink, Plus, Search } from "lucide-react";
import { STORE_STATUSES, STORE_STATUS_LABELS } from "@urcommerce/api-client";
import type { PlatformStore, StoreStatus } from "@urcommerce/api-client";
import { useStores } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatDate } from "@/features/stores/date";
import { StatusBadge } from "@/features/stores/status-badge";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { adminUrl, displayHost, storefrontUrl } from "@/lib/store-urls";

const PAGE_SIZE = 20;

function isStoreStatus(value: string | null): value is StoreStatus {
  return STORE_STATUSES.some((status) => status === value);
}

const statusOptions = [
  { value: "", label: "All statuses" },
  ...STORE_STATUSES.map((status) => ({
    value: status,
    label: STORE_STATUS_LABELS[status],
  })),
];

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function StoreRow({ store }: { store: PlatformStore }) {
  const navigate = useNavigate();
  const shop = storefrontUrl(store.subdomain);
  return (
    <tr
      onClick={() => navigate(`/stores/${store.id}`)}
      className="cursor-pointer border-t transition-colors hover:bg-muted/50"
    >
      <td className="px-4 py-3">
        <Link
          to={`/stores/${store.id}`}
          className="font-medium hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          {store.name}
        </Link>
        <p className="text-xs text-muted-foreground">{displayHost(shop)}</p>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={store.status} />
      </td>
      <td className="hidden px-4 py-3 text-sm text-muted-foreground md:table-cell">
        {formatDate(store.createdAt)}
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap justify-end gap-x-4 gap-y-1">
          {store.status === "CANCELLED" ? null : (
            <>
              <OpenLink href={shop} label="Storefront" />
              <OpenLink href={adminUrl(store.subdomain)} label="Admin" />
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

export function StoresRoute() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const status = isStoreStatus(statusParam) ? statusParam : undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);

  useEffect(() => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (debouncedSearch) next.set("search", debouncedSearch);
        else next.delete("search");
        if (debouncedSearch !== (current.get("search") ?? ""))
          next.delete("page");
        return next;
      },
      { replace: true },
    );
  }, [debouncedSearch, setParams]);

  const { data, isPending, isError, isFetching } = useStores({
    page,
    limit: PAGE_SIZE,
    status,
    search: debouncedSearch || undefined,
  });

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next);
  }

  const filtered = Boolean(status || debouncedSearch);

  return (
    <>
      <PageHeader
        title="Stores"
        count={data?.total}
        description="Every shop on the platform. Create one, open it, or change its status."
        action={
          <Button asChild leading={<Plus aria-hidden />}>
            <Link to="/stores/new">New store</Link>
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <Input
          aria-label="Search stores"
          placeholder="Search by name or subdomain"
          leading={<Search aria-hidden />}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onClear={search ? () => setSearch("") : undefined}
          clearLabel="Clear search"
          className="w-full sm:w-72"
        />
        <Select
          aria-label="Filter by status"
          options={statusOptions}
          value={status ?? ""}
          onChange={(event) =>
            update({ status: event.target.value || null, page: null })
          }
          className="w-full sm:w-48"
        />
      </div>

      {isPending ? (
        <LoadingState variant="table" label="Loading stores" />
      ) : isError ? (
        <ErrorState message="We could not load the stores. Check that you are still signed in." />
      ) : data.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No stores match" : "No stores yet"}
          description={
            filtered
              ? "Try a different name or status."
              : "Create the first shop and hand its owner their sign-in."
          }
          action={
            filtered ? (
              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setParams(new URLSearchParams());
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button asChild leading={<Plus aria-hidden />}>
                <Link to="/stores/new">New store</Link>
              </Button>
            )
          }
        />
      ) : (
        <>
          <div
            className="overflow-x-auto rounded-xl border bg-card"
            aria-busy={isFetching}
          >
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Store
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Status
                  </th>
                  <th
                    scope="col"
                    className="hidden px-4 py-2.5 font-medium md:table-cell"
                  >
                    Created
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-2.5 text-right font-medium"
                  >
                    Open
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((store) => (
                  <StoreRow key={store.id} store={store} />
                ))}
              </tbody>
            </table>
          </div>
          {data.totalPages > 1 ? (
            <nav
              aria-label="Pages"
              className="mt-4 flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                Page {data.page} of {data.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => update({ page: String(page - 1) })}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= data.totalPages}
                  onClick={() => update({ page: String(page + 1) })}
                >
                  Next
                </Button>
              </div>
            </nav>
          ) : null}
        </>
      )}
    </>
  );
}
