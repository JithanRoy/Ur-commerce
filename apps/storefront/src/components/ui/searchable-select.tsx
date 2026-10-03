"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectOption } from "./input";

const LIST_MAX_HEIGHT = 288;
const POPOVER_GAP = 4;

type PopoverPosition = {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
};

export type SearchableSelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  noResultsText?: string;
  disabled?: boolean;
  required?: boolean;
  triggerClassName: string;
  containerClassName?: string;
  onChange?: React.ChangeEventHandler<HTMLSelectElement>;
  onBlur?: React.FocusEventHandler<HTMLButtonElement>;
  leadingAdornment?: React.ReactNode;
  "aria-label"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-describedby"?: string;
};

function optionText(option: SelectOption): string {
  if (option.keywords) return option.keywords;
  return typeof option.label === "string" || typeof option.label === "number"
    ? String(option.label)
    : option.value;
}

function matches(option: SelectOption, query: string): boolean {
  const needle = query.trim().toLocaleLowerCase();
  if (needle === "" || option.alwaysShown) return true;
  return optionText(option).toLocaleLowerCase().includes(needle);
}

function positionBelowOrAbove(trigger: HTMLElement): PopoverPosition {
  const rect = trigger.getBoundingClientRect();
  const spaceBelow = window.innerHeight - rect.bottom - POPOVER_GAP * 2;
  const spaceAbove = rect.top - POPOVER_GAP * 2;
  const opensUp = spaceBelow < 220 && spaceAbove > spaceBelow;
  const width = Math.max(rect.width, 224);
  const left = Math.min(rect.left, window.innerWidth - width - POPOVER_GAP);
  return opensUp
    ? {
        left,
        width,
        bottom: window.innerHeight - rect.top + POPOVER_GAP,
        maxHeight: spaceAbove,
      }
    : {
        left,
        width,
        top: rect.bottom + POPOVER_GAP,
        maxHeight: spaceBelow,
      };
}

function usePopoverPosition(
  open: boolean,
  trigger: React.RefObject<HTMLButtonElement | null>,
) {
  const [position, setPosition] = React.useState<PopoverPosition | null>(null);

  React.useLayoutEffect(() => {
    if (!open || !trigger.current) return;
    const element = trigger.current;
    const update = () => setPosition(positionBelowOrAbove(element));
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, trigger]);

  return position;
}

function useDismiss(
  open: boolean,
  close: () => void,
  inside: React.RefObject<HTMLElement | null>[],
) {
  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (inside.some((ref) => ref.current?.contains(target))) return;
      close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close, inside]);
}

function emitNativeChange(select: HTMLSelectElement | null, value: string) {
  if (!select) return;
  select.value = value;
  select.dispatchEvent(new Event("change", { bubbles: true }));
}

function nextEnabledIndex(
  options: SelectOption[],
  from: number,
  step: 1 | -1,
): number {
  if (options.length === 0) return -1;
  for (let offset = 1; offset <= options.length; offset += 1) {
    const index =
      (from + step * offset + options.length * offset) % options.length;
    if (!options[index]?.disabled) return index;
  }
  return -1;
}

export function SearchableSelect({
  id,
  name,
  value,
  defaultValue,
  options,
  placeholder,
  searchPlaceholder = "Search…",
  noResultsText = "No matches",
  disabled,
  required,
  leadingAdornment,
  triggerClassName,
  containerClassName,
  onChange,
  onBlur,
  ...aria
}: SearchableSelectProps) {
  const generatedId = React.useId();
  const listboxId = `${id ?? generatedId}-listbox`;
  const optionId = (index: number) => `${listboxId}-${index}`;

  const trigger = React.useRef<HTMLButtonElement>(null);
  const popover = React.useRef<HTMLDivElement>(null);
  const nativeSelect = React.useRef<HTMLSelectElement>(null);
  const search = React.useRef<HTMLInputElement>(null);

  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [uncontrolledValue, setUncontrolledValue] = React.useState(
    defaultValue ?? "",
  );
  const selectedValue = value ?? uncontrolledValue;

  const allOptions = React.useMemo<SelectOption[]>(
    () =>
      placeholder !== undefined
        ? [{ value: "", label: placeholder }, ...options]
        : options,
    [options, placeholder],
  );
  const visible = React.useMemo(
    () => allOptions.filter((option) => matches(option, query)),
    [allOptions, query],
  );
  const hasMatches = visible.some((option) => !option.alwaysShown);
  const selected = allOptions.find((option) => option.value === selectedValue);
  const position = usePopoverPosition(open, trigger);

  const close = React.useCallback(() => {
    setOpen(false);
    setQuery("");
  }, []);
  const dismissTargets = React.useMemo(() => [trigger, popover], []);
  useDismiss(open, close, dismissTargets);

  const openList = (initialQuery = "") => {
    if (disabled) return;
    setQuery(initialQuery);
    const startIndex = allOptions.findIndex(
      (option) => option.value === selectedValue,
    );
    setActiveIndex(initialQuery ? 0 : Math.max(startIndex, 0));
    setOpen(true);
  };

  const popoverReady = open && position !== null;
  React.useEffect(() => {
    if (popoverReady) search.current?.focus();
  }, [popoverReady]);

  React.useEffect(() => {
    if (!open || activeIndex < 0) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  });

  const choose = (option: SelectOption | undefined) => {
    if (!option || option.disabled) return;
    setUncontrolledValue(option.value);
    close();
    trigger.current?.focus();
    if (option.value !== selectedValue) {
      emitNativeChange(nativeSelect.current, option.value);
    }
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((current) =>
        nextEnabledIndex(visible, current, event.key === "ArrowDown" ? 1 : -1),
      );
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      setActiveIndex(
        event.key === "Home"
          ? nextEnabledIndex(visible, -1, 1)
          : nextEnabledIndex(visible, 0, -1),
      );
    } else if (event.key === "Enter") {
      event.preventDefault();
      choose(visible[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      trigger.current?.focus();
    } else if (event.key === "Tab") {
      close();
    }
  };

  const onTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    } else if (
      event.key.length === 1 &&
      event.key !== " " &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      openList(event.key);
    }
  };

  return (
    <div className={cn("relative", containerClassName)}>
      {leadingAdornment}
      <button
        ref={trigger}
        id={id}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        {...aria}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onTriggerKeyDown}
        onBlur={onBlur}
        data-slot="select"
        className={cn(
          triggerClassName,
          "flex cursor-pointer items-center text-left",
        )}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            (!selected || selected.value === "") && "text-muted-foreground",
          )}
        >
          {selected?.label ?? placeholder ?? " "}
        </span>
      </button>
      <span className="pointer-events-none absolute inset-y-0 right-0 flex min-w-9 items-center justify-center text-muted-foreground">
        <ChevronDown
          className={cn("size-4 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </span>

      <select
        ref={nativeSelect}
        name={name}
        value={selectedValue}
        required={required}
        disabled={disabled}
        onChange={(event) => {
          setUncontrolledValue(event.target.value);
          onChange?.(event);
        }}
        tabIndex={-1}
        aria-hidden
        className="sr-only"
      >
        {allOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {optionText(option)}
          </option>
        ))}
      </select>

      {open && position
        ? createPortal(
            <div
              ref={popover}
              style={{
                position: "fixed",
                left: position.left,
                width: position.width,
                top: position.top,
                bottom: position.bottom,
              }}
              className="z-[60] flex animate-in flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg fade-in-0 zoom-in-95"
            >
              <div className="relative border-b">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  ref={search}
                  role="combobox"
                  aria-expanded
                  aria-controls={listboxId}
                  aria-autocomplete="list"
                  aria-activedescendant={
                    activeIndex >= 0 ? optionId(activeIndex) : undefined
                  }
                  aria-label={searchPlaceholder}
                  value={query}
                  placeholder={searchPlaceholder}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setActiveIndex(0);
                  }}
                  onKeyDown={onSearchKeyDown}
                  className="h-10 w-full bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground/70"
                />
              </div>
              <ul
                id={listboxId}
                role="listbox"
                style={{
                  maxHeight: Math.min(LIST_MAX_HEIGHT, position.maxHeight - 44),
                }}
                className="overflow-y-auto p-1"
              >
                {hasMatches ? null : (
                  <li
                    role="presentation"
                    className="px-3 py-6 text-center text-sm text-muted-foreground"
                  >
                    {noResultsText}
                  </li>
                )}
                {visible.map((option, index) => {
                  const isSelected = option.value === selectedValue;
                  return (
                    <li
                      key={option.value}
                      id={optionId(index)}
                      role="option"
                      aria-selected={isSelected}
                      aria-disabled={option.disabled || undefined}
                      onPointerMove={() => {
                        if (!option.disabled) setActiveIndex(index);
                      }}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => choose(option)}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm",
                        index === activeIndex && "bg-accent",
                        option.value === "" && "text-muted-foreground",
                        option.disabled && "cursor-not-allowed opacity-50",
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {option.label}
                      </span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" aria-hidden />
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
