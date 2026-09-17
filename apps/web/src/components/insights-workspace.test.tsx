import { screen, waitFor, within } from "@testing-library/react";
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

const submitButton = (name = "Get insights") => screen.getByRole("button", { name });

describe("asking a question", () => {
  test("starts with suggestions; picking one fills the form", async () => {
    mockFetch(() => Response.json(success));
    renderWithStore(<InsightsWorkspace />);

    expect(screen.getByRole("heading", { name: "What would you like to know?" })).toBeVisible();
    expect(submitButton()).toBeDisabled();

    await userEvent.click(screen.getByRole("button", { name: /Cómo está cambiando la IA/ }));

    expect(screen.getByLabelText("Prompt")).toHaveValue("¿Cómo está cambiando la IA la salud?");
    expect(screen.getByLabelText("Target language")).toHaveValue("es");
    await waitFor(() => expect(submitButton()).toBeEnabled());
  });

  test("submit stays disabled until both fields are valid, with messages as the user goes", async () => {
    mockFetch(() => Response.json(success));
    renderWithStore(<InsightsWorkspace />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Prompt"), "AI");
    await user.clear(screen.getByLabelText("Prompt"));
    expect(await screen.findByText("Enter a prompt")).toBeVisible();
    expect(submitButton()).toBeDisabled();

    await user.type(screen.getByLabelText("Prompt"), "AI in healthcare");
    expect(submitButton()).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Target language"), "fr");
    await waitFor(() => expect(submitButton()).toBeEnabled());
    expect(screen.queryByText("Enter a prompt")).not.toBeInTheDocument();
  });

  test("an over-long prompt is flagged on the field", async () => {
    mockFetch(() => Response.json(success));
    renderWithStore(<InsightsWorkspace />);

    await userEvent.click(screen.getByLabelText("Prompt"));
    await userEvent.paste("x".repeat(2001));

    expect(await screen.findByText("Prompt must be at most 2000 characters")).toBeVisible();
    expect(screen.getByText("2001 / 2000")).toBeVisible();
  });

  test("shows a loading state, then the insights for the trimmed prompt", async () => {
    let respond!: (response: Response) => void;
    const fetchMock = mockFetch(() => new Promise<Response>((resolve) => (respond = resolve)));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("  AI in healthcare  ", "es");
    await user.click(submitButton());

    expect(await screen.findByRole("button", { name: "Getting insights…" })).toBeDisabled();
    expect(screen.getByRole("heading", { level: 1, name: "AI in healthcare" })).toBeVisible();

    respond(Response.json(success));

    expect(await screen.findByRole("heading", { name: "AI-assisted diagnostics" })).toBeVisible();
    expect(await requestBody(fetchMock)).toEqual({ prompt: "AI in healthcare", targetLanguage: "es" });
    // The prompt is cleared for the next question; the language is kept
    expect(screen.getByLabelText("Prompt")).toHaveValue("");
    expect(screen.getByLabelText("Target language")).toHaveValue("es");
  });
});

describe("when more details are needed", () => {
  test("asks for details, then answers the combined question", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    renderWithStore(<InsightsWorkspace />);

    let user = await fillForm("AI");
    await user.click(submitButton());

    expect(await screen.findByRole("heading", { name: "Please provide more details" })).toBeVisible();
    expect(screen.getByRole("list", { name: "What you’ve asked so far" })).toHaveTextContent("AI");
    expect(screen.getByRole("heading", { name: "Tell us a little more" })).toBeVisible();

    fetchMock.mockImplementation(async () => Response.json(success));
    user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "in healthcare" }));
    expect(screen.getByLabelText("Add more details")).toHaveValue("in healthcare");
    await waitFor(() => expect(submitButton("Send details")).toBeEnabled());
    await user.click(submitButton("Send details"));

    expect(await screen.findByRole("heading", { level: 1, name: "AI in healthcare" })).toBeVisible();
    expect(await requestBody(fetchMock, 1)).toEqual({
      prompt: "in healthcare",
      targetLanguage: "en",
      contextId: "context-1",
    });
    expect(screen.queryByText("Please provide more details")).not.toBeInTheDocument();
  });

  test("start over closes the conversation", async () => {
    const fetchMock = mockFetch(() => Response.json(clarification));
    renderWithStore(<InsightsWorkspace />);
    const user = await fillForm("AI");
    await user.click(submitButton());

    await user.click(await screen.findByRole("button", { name: "Start over" }));

    expect(screen.queryByText("Please provide more details")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Prompt")).toBeInTheDocument();

    fetchMock.mockImplementation(async () => Response.json(success));
    await user.type(screen.getByLabelText("Prompt"), "AI in healthcare");
    await user.click(submitButton());
    await screen.findByRole("heading", { name: "AI-assisted diagnostics" });
    expect(await requestBody(fetchMock, 1)).not.toHaveProperty("contextId");
  });
});

describe("errors", () => {
  test("a field error from the server appears on that field only, without technical details", async () => {
    mockFetch(() => errorResponse(422, "INVALID_LANGUAGE", "Target language is not supported"));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(submitButton());

    expect(await screen.findByText("Target language is not supported")).toBeVisible();
    expect(screen.getByLabelText("Target language")).toHaveAttribute("aria-invalid", "true");
    expect(screen.queryByText("We couldn’t get your insights")).not.toBeInTheDocument();
    expect(screen.queryByText(/INVALID_LANGUAGE|422|req-test/)).not.toBeInTheDocument();
  });

  test("a network failure can be retried with the same question", async () => {
    const fetchMock = mockFetch(() => Promise.reject(new TypeError("Failed to fetch")));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(submitButton());

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn’t get your insights");
    expect(alert).toHaveTextContent("Could not reach the server. Check your connection and try again.");
    expect(screen.getByLabelText("Prompt")).toHaveValue("AI in healthcare");

    fetchMock.mockImplementation(async () => Response.json(success));
    await user.click(within(alert).getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { name: "AI-assisted diagnostics" })).toBeVisible();
    expect(await requestBody(fetchMock, 1)).toEqual({ prompt: "AI in healthcare", targetLanguage: "en" });
  });

  test("server errors show a plain message and can be dismissed", async () => {
    mockFetch(() => errorResponse(500, "INTERNAL_ERROR", "Internal server error"));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(submitButton());

    expect(
      await screen.findByText("Something went wrong on our side. Please try again."),
    ).toBeVisible();
    expect(screen.queryByText("Internal server error")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByText("We couldn’t get your insights")).not.toBeInTheDocument();
  });

  test("an expired conversation asks for the full question again, without a retry", async () => {
    mockFetch(() => errorResponse(404, "CONTEXT_NOT_FOUND", "Context not found"));
    renderWithStore(<InsightsWorkspace />);

    const user = await fillForm("AI in healthcare");
    await user.click(submitButton());

    expect(
      await screen.findByText("This conversation has expired. Ask your full question again."),
    ).toBeVisible();
    expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
  });
});
