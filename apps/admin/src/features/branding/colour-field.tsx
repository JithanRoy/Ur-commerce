import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const HEX = /^#[0-9a-fA-F]{6}$/;

export function ColourField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const valid = HEX.test(value);

  return (
    <Field
      id={id}
      label={label}
      hint={hint}
      error={valid ? undefined : "Use a six-digit hex value such as #0F766E."}
    >
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <Input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-invalid={!valid}
          className="font-mono uppercase"
        />
      </div>
    </Field>
  );
}
