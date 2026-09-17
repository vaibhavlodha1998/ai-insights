import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";

import { StatusRow } from "./status-row";

afterEach(cleanup);

test("shows the check name and status", () => {
  render(<StatusRow name="database" status="ok" />);

  expect(screen.getByText("database")).toBeDefined();
  expect(screen.getByText("ok").className).toContain("text-emerald-700");
});

test("marks unavailable checks in red", () => {
  render(<StatusRow name="redis" status="unavailable" />);

  expect(screen.getByText("unavailable").className).toContain("text-red-700");
});
