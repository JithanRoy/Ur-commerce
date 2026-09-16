import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { slugify } from "@/features/products/variant-matrix";

export type TaxonomyRow = {
  id: string;
  name: string;
  slug: string;
};

type Props<T extends TaxonomyRow> = {
  title: string;
  description: string;
  queryKey: string;
  load: () => Promise<T[]>;
  create: (input: { name: string; slug: string }) => Promise<unknown>;
  remove: (id: string) => Promise<unknown>;
  extraColumn?: { heading: string; render: (row: T) => React.ReactNode };
};

export function TaxonomyPage<T extends TaxonomyRow>({
  title,
  description,
  queryKey,
  load,
  create,
  remove,
  extraColumn,
}: Props<T>) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", queryKey] });

  const { data, isPending, error } = useQuery({
    queryKey: ["admin", queryKey],
    queryFn: load,
  });

  const createMutation = useMutation({
    mutationFn: create,
    onSuccess: () => {
      setName("");
      setFormError(null);
      invalidate();
    },
    onError: (mutationError) => {
      setFormError(
        isApiError(mutationError)
          ? mutationError.message
          : `Could not create the ${title.toLowerCase().replace(/s$/, "")}.`,
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: remove,
    onSuccess: invalidate,
    onError: (mutationError) => {
      setFormError(
        isApiError(mutationError) ? mutationError.message : "Could not delete.",
      );
    },
  });

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createMutation.mutate({ name: trimmed, slug: slugify(trimmed) });
  }

  return (
    <>
      <PageHeader
        title={title}
        count={data?.length}
        description={description}
      />

      <form onSubmit={onSubmit} className="mb-6 flex flex-wrap gap-3">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name`}
          aria-label={`New ${title.toLowerCase().replace(/s$/, "")} name`}
          className="h-10 min-w-56 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || name.trim() === ""}
          className="h-10 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {createMutation.isPending ? "Adding…" : "Add"}
        </button>
      </form>

      {formError ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {isPending ? <LoadingState /> : null}

      {error ? (
        <ErrorState
          message={
            error instanceof Error ? error.message : "Could not load the list."
          }
        />
      ) : null}

      {data && data.length === 0 ? (
        <EmptyState
          title={`No ${title.toLowerCase()} yet`}
          description="Add one above to get started."
        />
      ) : null}

      {data && data.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                {extraColumn ? (
                  <th className="px-4 py-3 font-medium">
                    {extraColumn.heading}
                  </th>
                ) : null}
                <th className="w-px px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {data.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{row.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {row.slug}
                  </td>
                  {extraColumn ? (
                    <td className="px-4 py-3">{extraColumn.render(row)}</td>
                  ) : null}
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => removeMutation.mutate(row.id)}
                      disabled={removeMutation.isPending}
                      aria-label={`Delete ${row.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
