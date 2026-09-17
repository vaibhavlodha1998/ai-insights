import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";

import { Alert, Button, DescriptionList, Field, SearchField, SegmentedControl, Textarea, fieldA11yProps } from ".";

describe("Button", () => {
  test("loading disables it and swaps the label", () => {
    render(
      <Button loading loadingText="Saving…">
        Save
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  test("defaults to type=button so it never submits a form by accident", () => {
    render(<Button>Cancel</Button>);

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveAttribute("type", "button");
  });
});

describe("Field", () => {
  test("links the label, and the error message when there is one", () => {
    render(
      <Field id="name" label="Name" error="Enter a name">
        <Textarea {...fieldA11yProps("name", "Enter a name")} />
      </Field>,
    );

    const control = screen.getByLabelText("Name");
    expect(control).toHaveAttribute("aria-invalid", "true");
    expect(control).toHaveAccessibleDescription("Enter a name");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a name");
  });

  test("is not marked invalid without an error", () => {
    render(
      <Field id="name" label="Name">
        <Textarea {...fieldA11yProps("name")} />
      </Field>,
    );

    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-invalid");
  });
});

describe("SegmentedControl", () => {
  function Harness({ disabled = false }: { disabled?: boolean }) {
    const [value, setValue] = useState<"asc" | "desc">("asc");
    return (
      <SegmentedControl
        label="Order"
        options={[
          { value: "asc", label: "A–Z" },
          { value: "desc", label: "Z–A" },
        ]}
        value={value}
        onChange={setValue}
        disabled={disabled}
      />
    );
  }

  test("is a labelled radio group", async () => {
    render(<Harness />);

    expect(screen.getByRole("group", { name: "Order" })).toBeVisible();
    await userEvent.click(screen.getByRole("radio", { name: "Z–A" }));
    expect(screen.getByRole("radio", { name: "Z–A" })).toBeChecked();
  });

  test("can be disabled as a whole", () => {
    render(<Harness disabled />);

    expect(screen.getByRole("radio", { name: "A–Z" })).toBeDisabled();
  });
});

test("SearchField shows a clear button only when there is text", async () => {
  const onValueChange = vi.fn();
  const { rerender } = render(<SearchField aria-label="Search" value="" onValueChange={onValueChange} />);

  expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

  rerender(<SearchField aria-label="Search" value="cloud" onValueChange={onValueChange} />);
  await userEvent.click(screen.getByRole("button", { name: "Clear" }));

  expect(onValueChange).toHaveBeenCalledWith("");
});

test("Alert uses an assertive role for danger and a polite one for warnings", () => {
  render(
    <>
      <Alert tone="danger" title="Failed" />
      <Alert tone="warning" title="Heads up" />
    </>,
  );

  expect(screen.getByRole("alert")).toHaveTextContent("Failed");
  expect(screen.getByRole("status")).toHaveTextContent("Heads up");
});

test("DescriptionList shows a dash for empty values", () => {
  render(
    <DescriptionList
      items={[
        { term: "Prompt", detail: "AI in health" },
        { term: "Context", detail: null },
      ]}
    />,
  );

  expect(screen.getByText("AI in health")).toBeVisible();
  expect(screen.getByText("—")).toBeVisible();
});
