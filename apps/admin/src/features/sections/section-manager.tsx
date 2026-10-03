import { LayoutList } from "lucide-react";
import { SECTION_MAX_COUNT, isApiError } from "@urcommerce/api-client";
import type { AdminSection } from "@urcommerce/api-client";
import { useReorderSections, useSections } from "@/api/sections";
import { PageHeader } from "@/components/ui/page-header";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { AddSectionPanel } from "./add-section-panel";
import { SectionCard } from "./section-card";

const TITLE = "Homepage sections";
const DESCRIPTION =
  "Choose what appears below the hero, and in what order. Changes go live on your next storefront visit.";

function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [moved] = next.splice(from, 1);
  if (moved === undefined) return items;
  next.splice(to, 0, moved);
  return next;
}

function EmptyIntro() {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-5">
      <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
        <LayoutList className="size-4" aria-hidden />
      </span>
      <div>
        <h2 className="font-medium">No sections yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your homepage shows only the hero. Add a product row, category grid or
          brand strip to give shoppers somewhere to go next.
        </p>
      </div>
    </div>
  );
}

function SectionList({ sections }: { sections: AdminSection[] }) {
  const reorder = useReorderSections({ success: "Section order saved." });

  const moveSection = (from: number, to: number) => {
    if (from === to || to < 0 || to >= sections.length) return;
    reorder.mutate(
      moveItem(
        sections.map((section) => section.id),
        from,
        to,
      ),
    );
  };

  return (
    <ol className="space-y-3" aria-label="Homepage sections in display order">
      {sections.map((section, index) => (
        <SectionCard
          key={section.id}
          section={section}
          index={index}
          total={sections.length}
          onMove={moveSection}
        />
      ))}
    </ol>
  );
}

function SectionCount({ sections }: { sections: AdminSection[] }) {
  const visible = sections.filter((section) => section.isActive).length;
  return (
    <p className="text-sm text-muted-foreground tabular-nums">
      <span className="font-medium text-foreground">{visible}</span> showing ·{" "}
      {sections.length} of {SECTION_MAX_COUNT}
    </p>
  );
}

export function SectionManager() {
  const { data: sections, isPending, error } = useSections();

  if (isPending) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <LoadingState variant="panels" label="Loading homepage sections" />
      </>
    );
  }

  if (error || !sections) {
    return (
      <>
        <PageHeader title={TITLE} description={DESCRIPTION} />
        <ErrorState
          message={
            isApiError(error)
              ? error.message
              : "We could not load your homepage sections."
          }
        />
      </>
    );
  }

  return (
    <>
      <PageHeader title={TITLE} description={DESCRIPTION} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section
          aria-labelledby="section-order-heading"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="section-order-heading" className="text-sm font-medium">
                Order on your homepage
              </h2>
              <p className="text-xs text-muted-foreground">
                Top to bottom, straight after the hero. Use the arrows to move a
                section.
              </p>
            </div>
            <SectionCount sections={sections} />
          </div>

          {sections.length === 0 ? (
            <EmptyIntro />
          ) : (
            <SectionList sections={sections} />
          )}
        </section>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <AddSectionPanel sections={sections} />
        </aside>
      </div>
    </>
  );
}
