import { useState } from "react";
import { Trash2 } from "lucide-react";
import { isApiError } from "@urcommerce/api-client";
import type { UploadScope } from "@urcommerce/api-client";
import {
  useCreateTaxonomyEntry,
  useDeleteTaxonomyEntry,
  useTaxonomyImage,
  useTaxonomyList,
  type TaxonomyResource,
  type TaxonomyRow,
} from "@/api/taxonomy";
import { ImageField } from "@/components/ui/image-field";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/states";
import { slugify } from "@/features/products/variant-matrix";
import { Input } from "@/components/ui/input";
import { Button, IconButton } from "@/components/ui/button";

type Props<T extends TaxonomyRow> = {
  title: string;
  description: string;
  resource: TaxonomyResource<T>;
  extraColumn?: { heading: string; render: (row: T) => React.ReactNode };
  image?: {
    scope: UploadScope;
    label: string;
    urlOf: (row: T) => string | null;
  };
};

export function TaxonomyPage<T extends TaxonomyRow>({
  title,
  description,
  resource,
  extraColumn,
  image,
}: Props<T>) {
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isPending, error } = useTaxonomyList(resource);

  const createMutation = useCreateTaxonomyEntry(resource, {
    success: (_created, input) => `${input.name} created.`,
    onSuccess: () => {
      setName("");
      setFormError(null);
    },
    onError: (mutationError) => {
      setFormError(
        isApiError(mutationError)
          ? mutationError.message
          : `Could not create the ${title.toLowerCase().replace(/s$/, "")}.`,
      );
    },
  });

  const imageMutation = useTaxonomyImage(resource, {
    success: (_result, input) =>
      input.objectKey === null ? "Image removed." : "Image saved.",
    onError: (mutationError) => {
      setFormError(
        isApiError(mutationError)
          ? mutationError.message
          : "Could not update the image.",
      );
    },
  });

  const removeMutation = useDeleteTaxonomyEntry(resource, {
    success: "Deleted.",
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
        <Button
          type="submit"
          disabled={name.trim() === ""}
          loading={createMutation.isPending}
          loadingText="Adding…"
        >
          Add
        </Button>
      </form>

      {formError ? (
        <p role="alert" className="mb-4 text-sm text-destructive">
          {formError}
        </p>
      ) : null}

      {isPending ? <LoadingState variant="table" /> : null}

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
                    <IconButton
                      variant="destructive-ghost"
                      size="icon-sm"
                      onClick={() => removeMutation.mutate(row.id)}
                      disabled={removeMutation.isPending}
                      label={`Delete ${row.name}`}
                    >
                      <Trash2 />
                    </IconButton>
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
