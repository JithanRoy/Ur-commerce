import { cn } from "@/lib/utils";

const sizes = {
  sm: "size-9 rounded-lg text-sm",
  lg: "size-14 rounded-xl text-xl",
} as const;

function hueFor(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1 ? `${words[0]?.[0]}${words[1]?.[0]}` : name.slice(0, 2);
  return letters.toUpperCase();
}

export function StoreMark({
  name,
  subdomain,
  size = "sm",
  muted = false,
}: {
  name: string;
  subdomain: string;
  size?: keyof typeof sizes;
  muted?: boolean;
}) {
  const hue = hueFor(subdomain);
  return (
    <span
      aria-hidden
      style={
        muted
          ? undefined
          : {
              backgroundColor: `oklch(0.94 0.04 ${hue})`,
              color: `oklch(0.38 0.11 ${hue})`,
            }
      }
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold tracking-tight",
        muted && "bg-muted text-muted-foreground",
        sizes[size],
      )}
    >
      {initialsOf(name)}
    </span>
  );
}
