import { Plus, X } from "lucide-react";
import type { OptionDraft } from "./variant-matrix";

type Props = {
  options: OptionDraft[];
  onChange: (options: OptionDraft[]) => void;
};

export function OptionsEditor({ options, onChange }: Props) {
  function updateOption(index: number, patch: Partial<OptionDraft>) {
    onChange(
      options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    );
  }

  return (
    <div className="space-y-4">
      {options.map((option, index) => (
        <div key={index} className="rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <input
              value={option.name}
              onChange={(event) =>
                updateOption(index, { name: event.target.value })
              }
              placeholder="Option name (Size, Colour…)"
              aria-label={`Option ${index + 1} name`}
              className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm"
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, i) => i !== index))}
              aria-label={`Remove option ${index + 1}`}
              className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>

          <input
            value={option.values.join(", ")}
            onChange={(event) =>
              updateOption(index, { values: event.target.value.split(",") })
            }
            placeholder="Values, comma separated — 40, 42, 44"
            aria-label={`Option ${index + 1} values`}
            className="mt-3 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Order matters — it sets how sizes sort on the storefront.
          </p>
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChange([...options, { name: "", values: [] }])}
        className="inline-flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm"
      >
        <Plus className="size-4" />
        Add option
      </button>
    </div>
  );
}
