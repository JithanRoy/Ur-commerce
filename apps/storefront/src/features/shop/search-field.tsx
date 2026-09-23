"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export function SearchField({
  className,
  autoFocus,
  onDone,
}: {
  className?: string;
  autoFocus?: boolean;
  onDone?: () => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const active = searchParams.get("search") ?? "";
  const [term, setTerm] = useState(active);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => setTerm(active), [active]);

  const submit = (value: string) => {
    const trimmed = value.trim();
    router.push(trimmed ? `/shop?search=${encodeURIComponent(trimmed)}` : "/shop");
    onDone?.();
  };

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit(term);
      }}
      className={cn("relative", className)}
    >
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={input}
        type="search"
        name="search"
        value={term}
        autoFocus={autoFocus}
        onChange={(event) => setTerm(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setTerm("");
            onDone?.();
          }
        }}
        placeholder="Search products"
        aria-label="Search products"
        className="h-10 w-full rounded-full border border-input bg-transparent pl-9 pr-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-foreground/30 [&::-webkit-search-cancel-button]:appearance-none"
      />
      {term ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setTerm("");
            input.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </form>
  );
}
