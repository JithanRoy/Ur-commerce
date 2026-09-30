import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap font-medium outline-none transition-[color,background-color,border-color,box-shadow,opacity,transform] duration-150 select-none active:scale-[0.97] motion-reduce:active:scale-100 focus-visible:ring-4 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-xs hover:bg-primary/90",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        accent: "bg-accent text-accent-foreground hover:bg-accent/80",
        outline:
          "border border-input bg-background shadow-xs hover:bg-muted hover:text-foreground",
        ghost: "hover:bg-muted hover:text-foreground",
        soft: "bg-primary/10 text-primary hover:bg-primary/15",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/25",
        "destructive-ghost":
          "text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:ring-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        xs: "h-7 gap-1 px-2 text-xs [&_svg:not([class*='size-'])]:size-3.5",
        sm: "h-8 gap-1.5 px-3 text-sm",
        md: "h-10 px-4 text-sm",
        lg: "h-11 px-5 text-sm",
        xl: "h-12 px-6 text-base",
        "icon-xs": "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-sm": "size-8",
        icon: "size-10",
        "icon-lg": "size-11",
      },
      shape: {
        default: "rounded-md",
        rounded: "rounded-lg",
        pill: "rounded-full",
        square: "rounded-none",
      },
      fullWidth: {
        true: "w-full",
        false: "",
      },
    },
    compoundVariants: [{ variant: "link", class: "h-auto px-0 shadow-none active:scale-100" }],
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "default",
      fullWidth: false,
    },
  },
);

export type ButtonVariant = NonNullable<
  VariantProps<typeof buttonVariants>["variant"]
>;
export type ButtonSize = NonNullable<
  VariantProps<typeof buttonVariants>["size"]
>;

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
    loadingText?: React.ReactNode;
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
  };

function loadingLabel(
  size: ButtonSize | null | undefined,
  asChild: boolean,
  children: React.ReactNode,
  loadingText: React.ReactNode,
): React.ReactNode {
  if (size?.startsWith("icon")) return null;
  if (asChild || loadingText === undefined) return children;
  return loadingText;
}

export function Button({
  className,
  variant,
  size,
  shape,
  fullWidth,
  asChild = false,
  loading = false,
  loadingText,
  leading,
  trailing,
  disabled,
  type,
  children,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot.Root : "button";
  const isDisabled = Boolean(disabled) || loading;
  const label = loading
    ? loadingLabel(size, asChild, children, loadingText)
    : children;

  return (
    <Comp
      {...props}
      {...(asChild
        ? { "aria-disabled": isDisabled || undefined }
        : { type: type ?? "button", disabled: isDisabled })}
      aria-busy={loading || undefined}
      data-slot="button"
      data-variant={variant ?? "primary"}
      data-size={size ?? "md"}
      className={cn(
        buttonVariants({ variant, size, shape, fullWidth }),
        className,
      )}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : leading}
      <Slot.Slottable>{label}</Slot.Slottable>
      {loading ? null : trailing}
    </Comp>
  );
}

export type IconButtonProps = Omit<
  ButtonProps,
  "leading" | "trailing" | "loadingText" | "aria-label"
> & {
  label: string;
};

export function IconButton({
  label,
  size = "icon",
  variant = "ghost",
  title,
  ...props
}: IconButtonProps) {
  return (
    <Button
      {...props}
      size={size}
      variant={variant}
      aria-label={label}
      title={title ?? label}
    />
  );
}
