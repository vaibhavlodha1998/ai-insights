"use client";

import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { SORT_OPTIONS, type SortOrder } from "../filter-sort";
import { selectSortOrder, setSortOrder } from "../insights-view-slice";

export function SortSelect() {
  const dispatch = useAppDispatch();
  const sortOrder = useAppSelector(selectSortOrder);

  return (
    <div className="flex flex-col gap-1.5 sm:w-48">
      <label htmlFor="insight-sort" className="text-sm font-medium">
        Sort by
      </label>
      <select
        id="insight-sort"
        value={sortOrder}
        onChange={(event) => dispatch(setSortOrder(event.target.value as SortOrder))}
        className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm shadow-sm outline-none focus:border-zinc-900 focus:ring-2 focus:ring-zinc-900/10 dark:border-zinc-700 dark:bg-zinc-900"
      >
        {SORT_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
