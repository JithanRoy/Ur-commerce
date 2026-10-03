import * as React from "react";
import { ChevronDown, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFieldControl } from "./field-context";
import { SearchableSelect } from "./searchable-select";

export type ControlSize = "sm" | "md" | "lg";

const DEFAULT_SIZE: ControlSize = "md";

const controlClass =
  "w-full min-w-0 border border-input bg-transparent outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground/60 focus-visible:border-foreground/30 focus-visible:ring-4 focus-visible:ring-foreground/5 aria-invalid:border-destructive/60 aria-invalid:focus-visible:ring-destructive/10 disabled:cursor-not-allowed disabled:opacity-50";

const boxSize: Record<ControlSize, string> = {
  sm: "h-8 rounded-md px-2.5 text-xs",
  md: "h-10 rounded-md px-3 text-sm",
  lg: "h-11 rounded-lg px-3.5 text-sm",
};

const areaSize: Record<ControlSize, string> = {
  sm: "rounded-md px-2.5 py-1.5 text-xs",
  md: "rounded-md px-3 py-2 text-sm",
  lg: "rounded-lg px-3.5 py-2.5 text-sm",
};

const slotWidth: Record<ControlSize, string> = {
  sm: "min-w-7",
  md: "min-w-9",
  lg: "min-w-10",
};

const leadingPad: Record<ControlSize, string> = {
  sm: "pl-7",
  md: "pl-9",
  lg: "pl-10",
};

const trailingPad: Record<ControlSize, [string, string, string]> = {
  sm: ["pr-7", "pr-13", "pr-19"],
  md: ["pr-9", "pr-17", "pr-25"],
  lg: ["pr-10", "pr-19", "pr-28"],
};

type ControlOwnProps = {
  size?: ControlSize;
  invalid?: boolean;
  containerClassName?: string;
};

function LeadingAdornment({
  size,
  children,
}: {
  size: ControlSize;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute inset-y-0 left-0 flex items-center justify-center text-muted-foreground [&_svg]:size-4",
        slotWidth[size],
      )}
    >
      {children}
    </span>
  );
}

function SlotButton({
  label,
  size,
  onClick,
  pressed,
  children,
}: {
  label: string;
  size: ControlSize;
  onClick: () => void;
  pressed?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      tabIndex={-1}
      className={cn(
        "inline-flex h-full items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground [&_svg]:size-4",
        slotWidth[size],
      )}
    >
      {children}
    </button>
  );
}

export type InputProps = Omit<React.ComponentProps<"input">, "size"> &
  ControlOwnProps & {
    leading?: React.ReactNode;
    trailing?: React.ReactNode;
    revealable?: boolean;
    onClear?: () => void;
    clearLabel?: string;
  };

export function Input({
  size = DEFAULT_SIZE,
  invalid,
  containerClassName,
  leading,
  trailing,
  revealable = true,
  onClear,
  clearLabel = "Clear",
  className,
  type = "text",
  id,
  required,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: InputProps) {
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  });
  const [revealed, setRevealed] = React.useState(false);

  const isRevealable = type === "password" && revealable;
  const hasValue = props.value !== undefined && String(props.value) !== "";
  const showClear = onClear !== undefined && hasValue && !control.disabled;

  const trailingItems: React.ReactNode[] = [];
  if (trailing !== undefined && trailing !== null) {
    trailingItems.push(
      <span
        key="trailing"
        className={cn(
          "pointer-events-none flex h-full items-center justify-center px-1 text-muted-foreground [&_svg]:size-4",
          slotWidth[size],
        )}
      >
        {trailing}
      </span>,
    );
  }
  if (showClear) {
    trailingItems.push(
      <SlotButton key="clear" label={clearLabel} size={size} onClick={onClear}>
        <X aria-hidden />
      </SlotButton>,
    );
  }
  if (isRevealable) {
    trailingItems.push(
      <SlotButton
        key="reveal"
        label={revealed ? "Hide password" : "Show password"}
        pressed={revealed}
        size={size}
        onClick={() => setRevealed((current) => !current)}
      >
        {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </SlotButton>,
    );
  }

  const trailingSlots = Math.min(
    trailingItems.length + (onClear !== undefined && !showClear ? 1 : 0),
    3,
  );

  const input = (
    <input
      {...props}
      {...control}
      type={isRevealable && revealed ? "text" : type}
      data-slot="input"
      className={cn(
        controlClass,
        boxSize[size],
        type === "search" && "[&::-webkit-search-cancel-button]:hidden",
        leading ? leadingPad[size] : "",
        trailingSlots > 0 ? trailingPad[size][trailingSlots - 1] : "",
        className,
      )}
    />
  );

  const wrapped =
    leading !== undefined ||
    trailing !== undefined ||
    isRevealable ||
    onClear !== undefined;
  if (!wrapped) return input;

  return (
    <div className={cn("relative", containerClassName)}>
      {leading ? (
        <LeadingAdornment size={size}>{leading}</LeadingAdornment>
      ) : null}
      {input}
      {trailingItems.length > 0 ? (
        <span className="absolute inset-y-0 right-0 flex items-center pr-0.5">
          {trailingItems}
        </span>
      ) : null}
    </div>
  );
}

export type TextareaProps = React.ComponentProps<"textarea"> &
  Omit<ControlOwnProps, "containerClassName"> & {
    autoResize?: boolean;
  };

export function Textarea({
  size = DEFAULT_SIZE,
  invalid,
  autoResize,
  className,
  id,
  required,
  disabled,
  rows = 3,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaProps) {
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  });

  return (
    <textarea
      {...props}
      {...control}
      rows={rows}
      data-slot="textarea"
      className={cn(
        controlClass,
        areaSize[size],
        autoResize ? "field-sizing-content min-h-20 resize-none" : "resize-y",
        className,
      )}
    />
  );
}

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  keywords?: string;
  alwaysShown?: boolean;
};

export type SelectProps = Omit<React.ComponentProps<"select">, "size"> &
  ControlOwnProps & {
    options?: SelectOption[];
    placeholder?: string;
    leading?: React.ReactNode;
    searchable?: boolean;
    searchPlaceholder?: string;
    noResultsText?: string;
  };

export function Select({
  size = DEFAULT_SIZE,
  invalid,
  containerClassName,
  options,
  placeholder,
  leading,
  searchable,
  searchPlaceholder,
  noResultsText,
  className,
  children,
  id,
  required,
  disabled,
  "aria-invalid": ariaInvalid,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectProps) {
  const control = useFieldControl({
    id,
    required,
    disabled,
    invalid,
    "aria-invalid": ariaInvalid,
    "aria-describedby": ariaDescribedBy,
  });
  const controlClassName = cn(
    controlClass,
    boxSize[size],
    "cursor-pointer appearance-none",
    leading ? leadingPad[size] : "",
    trailingPad[size][0],
    className,
  );

  if (searchable) {
    return (
      <SearchableSelect
        {...control}
        name={props.name}
        value={props.value === undefined ? undefined : String(props.value)}
        defaultValue={
          props.defaultValue === undefined
            ? undefined
            : String(props.defaultValue)
        }
        options={options ?? []}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        noResultsText={noResultsText}
        onChange={props.onChange}
        aria-label={props["aria-label"]}
        triggerClassName={controlClassName}
        containerClassName={containerClassName}
        leadingAdornment={
          leading ? (
            <LeadingAdornment size={size}>{leading}</LeadingAdornment>
          ) : null
        }
      />
    );
  }

  return (
    <div className={cn("relative", containerClassName)}>
      {leading ? (
        <LeadingAdornment size={size}>{leading}</LeadingAdornment>
      ) : null}
      <select
        {...props}
        {...control}
        data-slot="select"
        className={controlClassName}
      >
        {placeholder !== undefined ? (
          <option value="">{placeholder}</option>
        ) : null}
        {options?.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
        {children}
      </select>
      <span
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 flex items-center justify-center text-muted-foreground",
          slotWidth[size],
        )}
      >
        <ChevronDown className="size-4" aria-hidden />
      </span>
    </div>
  );
}

export type ChoiceProps = Omit<React.ComponentProps<"input">, "type"> & {
  label?: React.ReactNode;
  description?: React.ReactNode;
  containerClassName?: string;
};

function ChoiceInput({
  type,
  label,
  description,
  className,
  containerClassName,
  ...props
}: ChoiceProps & { type: "checkbox" | "radio" }) {
  const box = (
    <input
      {...props}
      type={type}
      data-slot={type}
      className={cn(
        "size-4 shrink-0 cursor-pointer border-input accent-primary disabled:cursor-not-allowed disabled:opacity-50",
        type === "checkbox" ? "rounded" : "rounded-full",
        className,
      )}
    />
  );
  if (label === undefined) return box;

  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-start gap-2.5 text-sm",
        props.disabled && "cursor-not-allowed opacity-60",
        containerClassName,
      )}
    >
      <span className="flex h-5 items-center">{box}</span>
      <span className="leading-5">
        {label}
        {description ? (
          <span className="block text-xs text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}

export function Checkbox(props: ChoiceProps) {
  return <ChoiceInput {...props} type="checkbox" />;
}

export function Radio(props: ChoiceProps) {
  return <ChoiceInput {...props} type="radio" />;
}
