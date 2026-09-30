import { useEffect, useState } from "react";
import { useLocation, useSearchParams, type To } from "react-router";
import { useDebouncedValue } from "./use-debounced-value";

type ListParamChanges = {
  page?: number;
  search?: string;
  status?: string;
};

type ListReturnState = { listSearch?: string } | null;

function parsePage(raw: string | null): number {
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 1 ? parsed : 1;
}

function writeParam(params: URLSearchParams, key: string, value: string) {
  if (value) params.set(key, value);
  else params.delete(key);
}

function resetsPage(changes: ListParamChanges): boolean {
  return "search" in changes || "status" in changes;
}

export function useListParams<S extends string>(statuses: readonly S[]) {
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get("page"));
  const search = params.get("q") ?? "";
  const rawStatus = params.get("status");
  const status: S | "" =
    statuses.find((entry) => entry === rawStatus) ?? "";

  const update = (changes: ListParamChanges, replace: boolean) => {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (changes.search !== undefined) {
          writeParam(next, "q", changes.search.trim());
        }
        if (changes.status !== undefined) {
          writeParam(next, "status", changes.status);
        }
        const nextPage = changes.page ?? (resetsPage(changes) ? 1 : page);
        writeParam(next, "page", nextPage > 1 ? String(nextPage) : "");
        return next;
      },
      { replace },
    );
  };

  return {
    page,
    search,
    status,
    setPage: (nextPage: number) => update({ page: nextPage }, false),
    setStatus: (nextStatus: S | "") => update({ status: nextStatus }, false),
    commitSearch: (nextSearch: string) =>
      update({ search: nextSearch }, true),
  };
}

export function useDebouncedSearchInput(
  committed: string,
  commit: (value: string) => void,
) {
  const [input, setInput] = useState(committed);
  const debounced = useDebouncedValue(input);

  useEffect(() => {
    if (debounced.trim() !== committed) commit(debounced);
  }, [debounced]);

  useEffect(() => {
    if (committed !== debounced.trim()) setInput(committed);
  }, [committed]);

  const clear = () => {
    setInput("");
    commit("");
  };

  return { input, setInput, clear };
}

export function useListLinkState(): { listSearch: string } {
  const location = useLocation();
  return { listSearch: location.search };
}

export function useBackToList(pathname: string): To {
  const location = useLocation();
  const listSearch = (location.state as ListReturnState)?.listSearch ?? "";
  return { pathname, search: listSearch };
}
