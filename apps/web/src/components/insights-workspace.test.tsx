import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";

import { errorResponse, makeInsight, mockFetch, renderWithStore, requestBody } from "@/test/utils";

import { InsightsWorkspace } from "./insights-workspace";

const success = {
  status: "SUCCESS",
  responseId: "response-1",
  contextId: "context-1",
  insights: [makeInsight(1, { title: "AI-assisted diagnostics" })],
  pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasNextPage: false },
};

const clarification = {
  status: "NEEDS_CLARIFICATION",
  message: "Please provide more details",
  contextId: "context-1",
};

async function fillForm(prompt: string, language = "en", label = "Prompt") {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(label), prompt);
  if (language) await user.selectOptions(screen.getByLabelText("Target language"), language);
  return user;
}

describe("prompt form", () => {
  test("submit stays disabled until both fields are valid", async () => {
    mockFetch(() => Response.json(success));
    renderWithStore(<InsightsWorkspace />);
    const submit = screen.getByRole("button", { name: "Get insights" });

    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Prompt"), "   ");
    expect(submit).toBeDisabled();

    await userEvent.type(screen.getByLabelText("Prompt"), "AI in healthcare");
    expect(submit).toBeDisabled();

    await userEvent.selectOptions(screen.getByLabelText("Target language"), "fr");
    await waitFor(() => expect(submit).toBeEnabled());
  });

  test("submits the trimmed prompt and renders the insights", async () => {
    const fetchMock = mockFetch(() => Response.json(success));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("  AI in healthcare  ", "es");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    expect(await screen.findByRole("heading", { name: "AI-assisted diagnostics" })).toBeVisible();
    expect(await requestBody(fetchMock)).toEqual({ prompt: "AI in healthcare", targetLanguage: "es" });
    // The prompt is cleared for the next question; the language is kept
    expect(screen.getByLabelText("Prompt")).toHaveValue("");
    expect(screen.getByLabelText("Target language")).toHaveValue("es");
  });
});

describe("clarification", () => {
  test("asks for details, then continues the same conversation", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    renderWithStore(<InsightsWorkspace />);

    let user = await fillForm("AI");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    expect(await screen.findByRole("heading", { name: "Please provide more details" })).toBeVisible();
    expect(screen.getByRole("list", { name: "Prompts so far" })).toHaveTextContent("AI");

    fetchMock.mockImplementation(async () => Response.json(success));
    user = await fillForm("in healthcare", "", "Add more details");
    await user.click(screen.getByRole("button", { name: "Send details" }));

    expect(await screen.findByRole("heading", { name: "AI-assisted diagnostics" })).toBeVisible();
    expect(await requestBody(fetchMock, 1)).toEqual({
      prompt: "in healthcare",
      targetLanguage: "en",
      contextId: "context-1",
    });
    expect(screen.queryByText("Please provide more details")).not.toBeInTheDocument();
  });

  test("start over closes the thread", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    renderWithStore(<InsightsWorkspace />);
    const user = await fillForm("AI");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    await user.click(await screen.findByRole("button", { name: "Start over" }));

    expect(screen.queryByText("Please provide more details")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();

    fetchMock.mockImplementation(async () => Response.json(success));
    await user.type(screen.getByLabelText("Prompt"), "AI in healthcare");
    await user.click(screen.getByRole("button", { name: "Get insights" }));
    await screen.findByRole("heading", { name: "AI-assisted diagnostics" });
    expect(await requestBody(fetchMock, 1)).not.toHaveProperty("contextId");
  });
});

describe("errors", () => {
  test("field errors from the API appear on the field", async () => {
    mockFetch(() =>
      errorResponse(422, "INVALID_LANGUAGE", "Target language is not supported", [
        { type: "INVALID_LANGUAGE", loc: ["body"], msg: "Target language is not supported" },
      ]),
    );
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    await waitFor(() =>
      expect(screen.getByLabelText("Target language")).toHaveAttribute("aria-invalid", "true"),
    );
    expect(await screen.findByText("INVALID_LANGUAGE")).toBeVisible();
    expect(screen.getAllByText("Target language is not supported").length).toBeGreaterThan(0);
    expect(screen.getByText("req-test")).toBeVisible();
  });

  test("other errors show a dismissible structured alert", async () => {
    mockFetch(() => errorResponse(404, "CONTEXT_NOT_FOUND", "Context not found"));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    expect(await screen.findByText("Context not found")).toBeVisible();
    expect(screen.getByText("CONTEXT_NOT_FOUND")).toBeVisible();
    expect(screen.getByText("404")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("Context not found")).not.toBeInTheDocument();
  });

  test("network failures are reported without a request id", async () => {
    mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(screen.getByRole("button", { name: "Get insights" }));

    expect(await screen.findByText("NETWORK_ERROR")).toBeVisible();
  });
});
