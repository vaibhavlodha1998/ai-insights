import { expect, test, type Page } from "@playwright/test";

async function submitPrompt(page: Page, prompt: string, language = "en") {
  await page.getByLabel(/^(Prompt|Add more details)$/).fill(prompt);
  const languageField = page.getByLabel("Target language");
  if ((await languageField.inputValue()) !== language) {
    await languageField.selectOption(language);
  }
  await page.getByRole("button", { name: /^(Get insights|Send details)$/ }).click();
}

function insightTitles(page: Page) {
  return page.getByRole("list", { name: "Insights" }).getByRole("heading").allTextContents();
}

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

test("submit is disabled until the form is valid", async ({ page }) => {
  const submit = page.getByRole("button", { name: "Get insights" });
  await expect(submit).toBeDisabled();

  await page.getByLabel("Prompt").fill("How is AI changing healthcare?");
  await expect(submit).toBeDisabled();

  await page.getByLabel("Target language").selectOption("en");
  await expect(submit).toBeEnabled();

  await page.getByLabel("Prompt").fill("");
  await expect(page.getByText("Enter a prompt")).toBeVisible();
  await expect(submit).toBeDisabled();
});

test("a suggestion fills the form", async ({ page }) => {
  await page.getByRole("button", { name: /Cómo está cambiando la IA la salud/ }).click();

  await expect(page.getByLabel("Prompt")).toHaveValue("¿Cómo está cambiando la IA la salud?");
  await expect(page.getByLabel("Target language")).toHaveValue("es");
  await page.getByRole("button", { name: "Get insights" }).click();

  await expect(
    page.getByRole("heading", { name: "Los diagnósticos asistidos por IA llegan a las clínicas" }),
  ).toBeVisible();
});

test("results load more pages, filter with search and sort", async ({ page }) => {
  const pageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/insights?")) pageRequests.push(request.url());
  });

  await submitPrompt(page, "How is AI changing healthcare?");

  const list = page.getByRole("list", { name: "Insights" });
  await expect(page.getByRole("heading", { level: 1, name: "How is AI changing healthcare?" })).toBeVisible();
  await expect(list.getByRole("article")).toHaveCount(10);
  await expect(page.getByTestId("results-summary")).toHaveText("Showing 10 of 20 insights");

  await page.getByRole("button", { name: "Load more" }).click();
  await expect(list.getByRole("article")).toHaveCount(20);
  await expect(page.getByText("All 20 insights loaded")).toBeVisible();
  // Page 1 came with the POST; only page 2 was requested separately
  expect(pageRequests).toHaveLength(1);
  expect(pageRequests[0]).toContain("page=2");

  await page.getByLabel("Search").fill("passkeys");
  await expect(list.getByRole("article")).toHaveCount(1);
  await expect(page.getByTestId("results-summary")).toHaveText("1 of 20 insights match “passkeys”");
  await expect(list.locator("mark").first()).toHaveText(/passkeys/i);
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(list.getByRole("article")).toHaveCount(20);

  await expect(page.getByRole("radio", { name: "Z–A" })).toBeDisabled();
  await page.getByLabel("Sort by").selectOption("title");
  const ascending = await insightTitles(page);
  expect(ascending).toEqual(
    [...ascending].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
  );

  await page.getByText("Z–A").click();
  await expect.poll(() => insightTitles(page)).toEqual([...ascending].reverse());
});

test("a vague prompt asks for details, and the follow-up completes it", async ({ page }) => {
  await submitPrompt(page, "AI");

  await expect(page.getByRole("heading", { name: "Please provide more details" })).toBeVisible();
  await expect(page.getByRole("list", { name: "What you’ve asked so far" })).toContainText("AI");
  await expect(page.getByRole("heading", { name: "Tell us a little more" })).toBeVisible();

  await page.getByRole("button", { name: "in healthcare" }).click();
  await page.getByRole("button", { name: "Send details" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "AI in healthcare" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Insights" }).getByRole("article")).toHaveCount(10);
  await expect(page.getByRole("heading", { name: "Please provide more details" })).toHaveCount(0);
});

test("a server-side field error is shown on the field, in plain words", async ({ page }) => {
  // The form can't send an unsupported language, so rewrite the outgoing request
  await page.route("**/api/prompts", async (route) => {
    const body = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...body, targetLanguage: "jp" }) });
  });

  await submitPrompt(page, "How is AI changing healthcare?");

  await expect(page.getByText("Target language is not supported")).toBeVisible();
  await expect(page.getByLabel("Target language")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("INVALID_LANGUAGE")).toHaveCount(0);
});

test("when the server can't be reached, the question can be retried", async ({ page }) => {
  let failNext = true;
  await page.route("**/api/prompts", async (route) => {
    if (failNext) {
      failNext = false;
      await route.abort("connectionrefused");
    } else {
      await route.continue();
    }
  });

  await submitPrompt(page, "How is AI changing healthcare?");

  const alert = page.getByRole("alert").filter({ hasText: "We couldn’t get your insights" });
  await expect(alert).toContainText("Could not reach the server. Check your connection and try again.");
  await alert.getByRole("button", { name: "Try again" }).click();

  await expect(page.getByRole("list", { name: "Insights" }).getByRole("article")).toHaveCount(10);
});

test("the session state page shows what the store holds", async ({ page }) => {
  await submitPrompt(page, "How is AI changing healthcare?");
  await expect(page.getByRole("list", { name: "Insights" })).toBeVisible();

  // Client-side navigation keeps the store
  await page.getByRole("link", { name: "Session state" }).click();

  await expect(page.getByRole("heading", { level: 1, name: "Session state" })).toBeVisible();
  const row = (term: string) => page.locator("dt", { hasText: term }).locator("xpath=following-sibling::dd");
  await expect(row("Prompt")).toHaveText("How is AI changing healthcare?");
  await expect(row("Status")).toHaveText(/Insights ready/i);
  await expect(row("Pages loaded")).toHaveText("1 of 2");
  await expect(row("Insights loaded")).toHaveText("10 of 20");
});
