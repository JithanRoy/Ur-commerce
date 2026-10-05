import { User } from "lucide-react";
import { cn } from "@/lib/utils";

const avatarSize = {
  sm: "size-7 text-[11px]",
  md: "size-9 text-xs",
  lg: "size-10 text-sm",
} as const;

export type AvatarSize = keyof typeof avatarSize;

export function initialsOf(name: string): string {
  return name
    .replace(/\./g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string | null | undefined;
  size?: AvatarSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary/12 font-semibold text-primary",
        avatarSize[size],
        className,
      )}
    >
      {name ? initialsOf(name) : <User className="size-3.5" />}
    </span>
  );
}
