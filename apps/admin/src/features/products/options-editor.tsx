import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button, IconButton } from "@/components/ui/button";
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
            <Input
              value={option.name}
              onChange={(event) =>
                updateOption(index, { name: event.target.value })
              }
              placeholder="Option name (Size, Colour…)"
              aria-label={`Option ${index + 1} name`}
              className="h-9 flex-1"
            />
            <IconButton
              label={`Remove option ${index + 1}`}
              onClick={() => onChange(options.filter((_, i) => i !== index))}
              className="size-9 text-muted-foreground"
            >
              <X />
            </IconButton>
          </div>

          <Input
            value={option.values.join(", ")}
            onChange={(event) =>
              updateOption(index, { values: event.target.value.split(",") })
            }
            placeholder="Values, comma separated — 40, 42, 44"
            aria-label={`Option ${index + 1} values`}
            className="mt-3 h-9"
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Order matters — it sets how sizes sort on the storefront.
          </p>
        </div>
      ))}

      <Button
        variant="outline"
        onClick={() => onChange([...options, { name: "", values: [] }])}
        leading={<Plus />}
        className="h-9 px-3"
      >
        Add option
      </Button>
    </div>
  );
}
