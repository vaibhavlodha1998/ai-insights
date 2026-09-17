"use client";

import { useEffect, useState } from "react";

import { SearchField } from "@/components/ui";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { selectSearchTerm, setSearchTerm } from "../insights-view-slice";

export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Keeps keystrokes in local state; only the settled value reaches the store, so the
 * list filters once per pause in typing instead of once per character.
 */
export function SearchInput() {
  const dispatch = useAppDispatch();
  const storedTerm = useAppSelector(selectSearchTerm);
  const [value, setValue] = useState(storedTerm);
  const debounced = useDebouncedValue(value, SEARCH_DEBOUNCE_MS);

  useEffect(() => {
    dispatch(setSearchTerm(debounced));
  }, [dispatch, debounced]);

  // Cleared from elsewhere (e.g. "Clear search" in the empty state): adjust during
  // render rather than in an effect, so the input never shows a stale value
  const [previousStoredTerm, setPreviousStoredTerm] = useState(storedTerm);
  if (storedTerm !== previousStoredTerm) {
    setPreviousStoredTerm(storedTerm);
    if (storedTerm === "") setValue("");
  }

  const handleChange = (next: string) => {
    setValue(next);
    // Clearing should show everything again right away
    if (next === "") dispatch(setSearchTerm(""));
  };

  return (
    <div className="flex grow flex-col gap-1.5">
      <label htmlFor="insight-search" className="text-[13px] font-semibold">
        Search
      </label>
      <SearchField
        id="insight-search"
        value={value}
        onValueChange={handleChange}
        placeholder="Search by text, category, source or tag"
      />
    </div>
  );
}
