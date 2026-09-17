"use client";

import { SegmentedControl, Select } from "@/components/ui";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

import { SORT_DIRECTION_OPTIONS, SORT_FIELD_OPTIONS, type SortField } from "../filter-sort";
import {
  selectSortDirection,
  selectSortField,
  setSortDirection,
  setSortField,
} from "../insights-view-slice";

/** Sort field plus an A–Z / Z–A toggle, which only applies to title and content. */
export function SortControls() {
  const dispatch = useAppDispatch();
  const field = useAppSelector(selectSortField);
  const direction = useAppSelector(selectSortDirection);

  return (
    <div className="flex items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="sort-field" className="text-[13px] font-semibold">
          Sort by
        </label>
        <Select
          id="sort-field"
          className="w-[150px]"
          options={SORT_FIELD_OPTIONS}
          value={field}
          onChange={(event) => dispatch(setSortField(event.target.value as SortField))}
        />
      </div>
      <SegmentedControl
        label="Order"
        hideLabel
        className="w-[120px]"
        options={SORT_DIRECTION_OPTIONS}
        value={direction}
        onChange={(next) => dispatch(setSortDirection(next))}
        disabled={field === "relevance"}
      />
    </div>
  );
}
