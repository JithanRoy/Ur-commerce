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
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={valid ? value : "#000000"}
          onChange={(event) => onChange(event.target.value.toUpperCase())}
          className="size-10 shrink-0 cursor-pointer rounded-md border border-input bg-transparent p-1"
        />
        <input
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-invalid={!valid}
          className="h-10 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm uppercase outline-none transition-shadow focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5 aria-invalid:border-destructive/60"
        />
      </div>
      {!valid ? (
        <p className="text-xs text-destructive">
          Use a six-digit hex value such as #0F766E.
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
