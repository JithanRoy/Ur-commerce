import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Plus,
  Search,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { isApiError } from "@urcommerce/api-client";
import type { AdminProduct } from "@urcommerce/api-client";
import { adminApi } from "@/lib/api";
import { Button, IconButton } from "@/components/ui/button";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

function moveId(ids: string[], id: string, delta: number): string[] {
  const from = ids.indexOf(id);
  const to = from + delta;
  if (from < 0 || to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return ids;
  next.splice(to, 0, moved);
  return next;
}

export function CollectionProductsRoute() {
  const { collectionId } = useParams();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const collection = useQuery({
    queryKey: ["admin", "collections", collectionId],
    queryFn: () => adminApi.collections.get(collectionId as string),
    enabled: Boolean(collectionId),
  });

  const catalogue = useQuery({
    queryKey: ["admin", "products", "all-for-collections"],
    queryFn: () => adminApi.products.list({ limit: 100 }),
    select: (page) =>
      page.items.filter(
        (product) => !product.slug.includes("__archived_"),
      ),
  });

  useEffect(() => {
    if (selectedIds !== null || !collection.data) return;
    setSelectedIds(
      [...collection.data.products]
        .sort((a, b) => a.position - b.position)
        .map((entry) => entry.product.id),
    );
  }, [collection.data, selectedIds]);

  const byId = useMemo(() => {
    const map = new Map<string, AdminProduct>();
    for (const product of catalogue.data ?? []) map.set(product.id, product);
    return map;
  }, [catalogue.data]);

  const chosen = selectedIds ?? [];
  const available = (catalogue.data ?? []).filter(
    (product) =>
      !chosen.includes(product.id) &&
      product.name.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const initialIds = useMemo(
    () =>
      [...(collection.data?.products ?? [])]
        .sort((a, b) => a.position - b.position)
        .map((entry) => entry.product.id),
    [collection.data],
  );
  const isDirty = chosen.join("|") !== initialIds.join("|");

  const save = useMutation({
    mutationFn: () =>
      adminApi.collections.setProducts(
        collectionId as string,
        chosen.map((productId, index) => ({ productId, position: index })),
      ),
    onSuccess: () => {
      setError(null);
      toast.success(
        chosen.length === 0
          ? "Collection emptied."
          : `Collection saved with ${chosen.length} product${chosen.length === 1 ? "" : "s"}.`,
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "collections"] });
    },
    onError: (cause) =>
      setError(
        isApiError(cause)
          ? cause.message
          : "Could not save the collection.",
      ),
  });

  if (collection.isPending || catalogue.isPending) return <LoadingState variant="panels" />;
  if (collection.isError || !collection.data) {
    return <ErrorState message="Could not load that collection." />;
  }

  return (
    <>
      <Link
        to="/collections"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Collections
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {collection.data.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick the products in this collection and the order shoppers see
            them.
          </p>
        </div>
        <Button
          onClick={() => save.mutate()}
          disabled={!isDirty}
          loading={save.isPending}
          loadingText="Saving…"
          className="px-5"
        >
          Save collection
        </Button>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-medium">
            In this collection
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              {chosen.length}
            </span>
          </h2>
          {chosen.length === 0 ? (
            <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
              Nothing yet. Add products from the catalogue →
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {chosen.map((id, index) => {
                const product = byId.get(id);
                return (
                  <li
                    key={id}
                    className="flex items-center gap-3 rounded-lg border px-3 py-2"
                  >
                    <span className="w-6 text-center text-xs font-medium text-muted-foreground">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">
                        {product?.name ?? "Unknown product"}
                      </span>
                      {product?.status !== "ACTIVE" ? (
                        <span className="text-xs text-warning">
                          {product?.status === "DRAFT"
                            ? "Draft — hidden from shoppers"
                            : product?.status ?? ""}
                        </span>
                      ) : null}
                    </span>
                    <IconButton
                      label={`Move ${product?.name ?? "product"} up`}
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        setSelectedIds(moveId(chosen, id, -1))
                      }
                      disabled={index === 0}
                      className="disabled:opacity-30"
                    >
                      <ArrowUp className="size-3.5" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Move ${product?.name ?? "product"} down`}
                      variant="outline"
                      size="icon-sm"
                      onClick={() => setSelectedIds(moveId(chosen, id, 1))}
                      disabled={index === chosen.length - 1}
                      className="disabled:opacity-30"
                    >
                      <ArrowDown className="size-3.5" aria-hidden />
                    </IconButton>
                    <IconButton
                      label={`Remove ${product?.name ?? "product"} from collection`}
                      variant="outline"
                      size="icon-sm"
                      onClick={() =>
                        setSelectedIds(chosen.filter((x) => x !== id))
                      }
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="size-3.5" aria-hidden />
                    </IconButton>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="rounded-xl border bg-card p-5">
          <h2 className="font-medium">Catalogue</h2>
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search products"
            aria-label="Search catalogue"
            leading={<Search aria-hidden />}
            onClear={() => setSearch("")}
            containerClassName="mt-3"
          />
          <ul className="mt-3 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
            {available.length === 0 ? (
              <li className="px-1 py-6 text-center text-sm text-muted-foreground">
                {search ? "No matches." : "Everything is already in the collection."}
              </li>
            ) : (
              available.map((product) => (
                <li
                  key={product.id}
                  className="flex items-center gap-3 rounded-lg border px-3 py-2"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {product.name}
                    </span>
                    <span
                      className={cn(
                        "text-xs",
                        product.status === "ACTIVE"
                          ? "text-muted-foreground"
                          : "text-warning",
                      )}
                    >
                      {product.status === "ACTIVE"
                        ? product.slug
                        : "Draft — hidden from shoppers"}
                    </span>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedIds([...chosen, product.id])}
                    aria-label={`Add ${product.name} to collection`}
                    leading={<Plus className="size-3.5" aria-hidden />}
                    className="gap-1 px-2.5 text-xs"
                  >
                    Add
                  </Button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </>
  );
}
