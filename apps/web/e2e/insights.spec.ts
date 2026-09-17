import { expect, test, type Page } from "@playwright/test";

async function submitPrompt(page: Page, prompt: string, language = "en") {
  const promptField = page.getByLabel(/^(Prompt|Add more details)$/);
  await promptField.fill(prompt);
  const languageField = page.getByLabel("Target language");
  if ((await languageField.inputValue()) !== language) {
    await languageField.selectOption(language);
  }
  await page.getByRole("button", { name: /Get insights|Send details/ }).click();
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
});

test("results load more pages, filter with search and sort", async ({ page }) => {
  const pageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/insights?")) pageRequests.push(request.url());
  });

  await submitPrompt(page, "How is AI changing healthcare?");

  const list = page.getByRole("list", { name: "Insights" });
  await expect(list.getByRole("article")).toHaveCount(10);
  await expect(page.getByTestId("results-summary")).toHaveText("Showing 10 of 20");

  await page.getByRole("button", { name: "Load more" }).click();
  await expect(list.getByRole("article")).toHaveCount(20);
  await expect(page.getByRole("button", { name: "Load more" })).toHaveCount(0);
  // Page 1 came with the POST; only page 2 was requested separately
  expect(pageRequests).toHaveLength(1);
  expect(pageRequests[0]).toContain("page=2");

  await page.getByLabel("Search").fill("passkeys");
  await expect(list.getByRole("article")).toHaveCount(1);
  await expect(page.getByTestId("results-summary")).toHaveText("1 of 20 loaded match");
  await page.getByLabel("Search").fill("");
  await expect(list.getByRole("article")).toHaveCount(20);

  await page.getByLabel("Sort by").selectOption("title-asc");
  const ascending = await insightTitles(page);
  expect(ascending).toEqual(
    [...ascending].sort((a, b) => a.localeCompare(b, "en", { sensitivity: "base" })),
  );

  await page.getByLabel("Sort by").selectOption("title-desc");
  expect(await insightTitles(page)).toEqual([...ascending].reverse());
});

test("a vague prompt asks for clarification, and the follow-up completes it", async ({ page }) => {
  await submitPrompt(page, "AI");

  await expect(page.getByRole("heading", { name: "Please provide more details" })).toBeVisible();
  await expect(page.getByRole("list", { name: "Prompts so far" })).toContainText("AI");
  await expect(page.getByRole("list", { name: "Insights" })).toHaveCount(0);

  await submitPrompt(page, "in healthcare");

  await expect(page.getByRole("list", { name: "Insights" }).getByRole("article")).toHaveCount(10);
  await expect(page.getByRole("heading", { name: "Please provide more details" })).toHaveCount(0);
});

test("results come back in the chosen language", async ({ page }) => {
  await submitPrompt(page, "¿Cómo está cambiando la IA la salud?", "es");

  await expect(
    page.getByRole("heading", { name: "Los diagnósticos asistidos por IA llegan a las clínicas" }),
  ).toBeVisible();
});

test("structured API errors are shown to the user", async ({ page }) => {
  // The form can't produce an unsupported language, so rewrite the outgoing request
  await page.route("**/api/prompts", async (route) => {
    const body = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...body, targetLanguage: "jp" }) });
  });

  await submitPrompt(page, "How is AI changing healthcare?");

  const alert = page.getByRole("alert").filter({ hasText: "INVALID_LANGUAGE" });
  await expect(alert).toContainText("Target language is not supported");
  await expect(alert).toContainText("422");
  await expect(page.getByLabel("Target language")).toHaveAttribute("aria-invalid", "true");
});
