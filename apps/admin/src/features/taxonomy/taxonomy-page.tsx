import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isApiError } from "@urcommerce/api-client";
import type { UploadScope } from "@urcommerce/api-client";
import { ImageField } from "./image-field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { slugify } from "@/features/products/variant-matrix";
import { Input } from "@/components/ui/input";

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
  image?: {
    scope: UploadScope;
    label: string;
    urlOf: (row: T) => string | null;
    setKey: (id: string, objectKey: string) => Promise<unknown>;
    clear: (id: string) => Promise<unknown>;
  };
};

export function TaxonomyPage<T extends TaxonomyRow>({
  title,
  description,
  queryKey,
  load,
  create,
  remove,
  extraColumn,
  image,
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
    onSuccess: (_created, input) => {
      setName("");
      setFormError(null);
      toast.success(`${input.name} created.`);
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

  const imageMutation = useMutation({
    mutationFn: (input: { id: string; objectKey: string | null }) => {
      if (!image) return Promise.resolve();
      return input.objectKey === null
        ? image.clear(input.id)
        : image.setKey(input.id, input.objectKey);
    },
    onSuccess: (_result, input) => {
      toast.success(input.objectKey === null ? "Image removed." : "Image saved.");
      invalidate();
    },
    onError: (mutationError) => {
      setFormError(
        isApiError(mutationError)
          ? mutationError.message
          : "Could not update the image.",
      );
    },
  });

  const removeMutation = useMutation({
    mutationFn: remove,
    onSuccess: () => {
      toast.success("Deleted.");
      invalidate();
    },
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
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={`New ${title.toLowerCase().replace(/s$/, "")} name`}
          aria-label={`New ${title.toLowerCase().replace(/s$/, "")} name`}
          className="min-w-56 flex-1"
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
                {image ? (
                  <th className="px-4 py-3 font-medium">{image.label}</th>
                ) : null}
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
                  {image ? (
                    <td className="px-4 py-3">
                      <ImageField
                        scope={image.scope}
                        label={image.label.toLowerCase()}
                        currentUrl={image.urlOf(row)}
                        disabled={imageMutation.isPending}
                        onUploaded={(objectKey) =>
                          imageMutation.mutate({ id: row.id, objectKey })
                        }
                        onCleared={() =>
                          imageMutation.mutate({ id: row.id, objectKey: null })
                        }
                      />
                    </td>
                  ) : null}
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
