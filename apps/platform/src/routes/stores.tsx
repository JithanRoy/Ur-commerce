import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { ExternalLink, Plus, Search } from "lucide-react";
import { STORE_STATUSES } from "@urcommerce/api-client";
import type {
  PlatformStore,
  PlatformStoreQuery,
  StoreStatus,
} from "@urcommerce/api-client";
import { useStoreCounts, useStores } from "@/api/stores";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { formatAgo, formatDate } from "@/features/stores/date";
import { FleetStrip } from "@/features/stores/fleet-strip";
import { StatusBadge } from "@/features/stores/status-badge";
import { StoreMark } from "@/features/stores/store-mark";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { adminUrl, displayHost, storefrontUrl } from "@/lib/store-urls";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

const statuses: readonly string[] = STORE_STATUSES;

function isStoreStatus(value: string | null): value is StoreStatus {
  return value !== null && statuses.includes(value);
}

function OpenLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="inline-flex items-center gap-1 rounded text-xs font-medium text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30"
    >
      {label}
      <ExternalLink className="size-3" aria-hidden />
    </a>
  );
}

function StoreRow({ store }: { store: PlatformStore }) {
  const navigate = useNavigate();
  const shop = storefrontUrl(store.subdomain);
  const closed = store.status === "CANCELLED";

  return (
    <tr
      onClick={() => navigate(`/stores/${store.id}`)}
      className="group cursor-pointer border-t transition-colors hover:bg-paper"
    >
      <td className="py-3 pl-4 pr-3">
        <div className="flex items-center gap-3">
          <StoreMark
            name={store.name}
            subdomain={store.subdomain}
            muted={closed}
          />
          <div className="min-w-0">
            <Link
              to={`/stores/${store.id}`}
              onClick={(event) => event.stopPropagation()}
              className={cn(
                "block truncate font-medium group-hover:text-primary",
                closed && "text-muted-foreground",
              )}
            >
              {store.name}
            </Link>
            <p className="truncate font-mono text-xs text-muted-foreground">
              {displayHost(shop)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        <StatusBadge status={store.status} />
      </td>
      <td className="hidden px-3 py-3 md:table-cell">
        <span
          title={formatDate(store.createdAt)}
          className="text-sm text-muted-foreground"
        >
          {formatAgo(store.createdAt)}
        </span>
      </td>
      <td className="py-3 pl-3 pr-4">
        {closed ? null : (
          <div className="flex justify-end gap-4">
            <OpenLink href={shop} label="Storefront" />
            <OpenLink href={adminUrl(store.subdomain)} label="Admin" />
          </div>
        )}
      </td>
    </tr>
  );
}

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label="Pages"
      className="flex items-center justify-between border-t px-4 py-3 text-sm"
    >
      <span className="text-muted-foreground tabular-nums">
        Page {page} of {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPage(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}

function NoStores({
  filtered,
  onClearFilters,
}: {
  filtered: boolean;
  onClearFilters: () => void;
}) {
  const action = filtered ? (
    <Button variant="outline" onClick={onClearFilters}>
      Clear filters
    </Button>
  ) : (
    <Button asChild leading={<Plus aria-hidden />}>
      <Link to="/stores/new">New store</Link>
    </Button>
  );
  return (
    <EmptyState
      title={filtered ? "No stores match" : "No stores yet"}
      description={
        filtered
          ? "Try another name, or clear the status filter."
          : "Create the first shop and send its owner their sign-in."
      }
      action={action}
    />
  );
}

function StoreList({
  query,
  filtered,
  onClearFilters,
  onPage,
}: {
  query: PlatformStoreQuery;
  filtered: boolean;
  onClearFilters: () => void;
  onPage: (page: number) => void;
}) {
  const { data, isPending, isError, isFetching } = useStores(query);

  if (isPending) {
    return (
      <div className="p-4">
        <LoadingState variant="table" label="Loading stores" />
      </div>
    );
  }
  if (isError) {
    return (
      <div className="p-4">
        <ErrorState message="The stores didn't load. Check that you're still signed in, then refresh." />
      </div>
    );
  }
  if (data.items.length === 0) {
    return (
      <div className="p-4">
        <NoStores filtered={filtered} onClearFilters={onClearFilters} />
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto" aria-busy={isFetching}>
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th scope="col" className="py-2.5 pl-4 pr-3 font-medium">
                Store
              </th>
              <th scope="col" className="px-3 py-2.5 font-medium">
                Status
              </th>
              <th
                scope="col"
                className="hidden px-3 py-2.5 font-medium md:table-cell"
              >
                Created
              </th>
              <th
                scope="col"
                className="py-2.5 pl-3 pr-4 text-right font-medium"
              >
                <span className="sr-only">Open</span>
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
      <Pagination
        page={data.page}
        totalPages={data.totalPages}
        onPage={onPage}
      />
    </>
  );
}

export function StoresRoute() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const status = isStoreStatus(statusParam) ? statusParam : undefined;
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [search, setSearch] = useState(params.get("search") ?? "");
  const debouncedSearch = useDebouncedValue(search.trim(), 300);
  const counts = useStoreCounts();

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

  const { data } = useStores({
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
        description="Every shop on the platform. Open one to edit it, reset a password or change its status."
        action={
          <Button asChild leading={<Plus aria-hidden />}>
            <Link to="/stores/new">New store</Link>
          </Button>
        }
      />

      <FleetStrip
        counts={counts}
        selected={status}
        onSelect={(next) => update({ status: next ?? null, page: null })}
      />

      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
          <Input
            aria-label="Search stores"
            placeholder="Search by name or subdomain"
            leading={<Search aria-hidden />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={search ? () => setSearch("") : undefined}
            clearLabel="Clear search"
            className="w-full sm:w-80"
          />
          {data ? (
            <p
              className="ml-auto text-sm text-muted-foreground tabular-nums"
              aria-live="polite"
            >
              {data.total} {data.total === 1 ? "store" : "stores"}
              {filtered ? " match" : ""}
            </p>
          ) : null}
        </div>

        <StoreList
          query={{
            page,
            limit: PAGE_SIZE,
            status,
            search: debouncedSearch || undefined,
          }}
          filtered={filtered}
          onClearFilters={() => {
            setSearch("");
            setParams(new URLSearchParams());
          }}
          onPage={(next) => update({ page: String(next) })}
        />
      </div>
    </>
  );
}
