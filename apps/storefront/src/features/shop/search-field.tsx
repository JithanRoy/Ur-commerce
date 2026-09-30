"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
      className={className}
    >
      <Input
        ref={input}
        type="search"
        name="search"
        size="md"
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
        leading={<Search />}
        onClear={() => {
          setTerm("");
          input.current?.focus();
        }}
        clearLabel="Clear search"
        className="rounded-full"
      />
    </form>
  );
}
