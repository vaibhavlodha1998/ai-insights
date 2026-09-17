"use client";

import { useEffect, useState } from "react";

import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAppDispatch } from "@/store/hooks";

import { setSearchTerm } from "../insights-view-slice";

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Keeps keystrokes in local state; only the settled value reaches the store, so the
 * list filters once per pause in typing instead of once per character.
 */
export function SearchInput() {
  const dispatch = useAppDispatch();
  const [value, setValue] = useState("");
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    dispatch(setSearchTerm(debounced));
  }, [dispatch, debounced]);

  return (
    <div className="flex flex-1 flex-col gap-1.5">
      <label htmlFor="insight-search" className="text-sm font-medium">
        Search
      </label>
      <input
        id="insight-search"
        type="search"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Filter by text, category, source or tag"
        className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900 dark:focus:border-zinc-300"
      />
    </div>
  );
}
