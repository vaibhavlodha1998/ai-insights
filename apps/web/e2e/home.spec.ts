import { expect, test } from "@playwright/test";

test("home page shows every dependency as healthy", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "starter" })).toBeVisible();
  for (const name of ["api", "database", "redis"]) {
    const row = page.getByRole("listitem").filter({ hasText: name });
    await expect(row).toContainText("ok");
  }
});

test("/api/* is proxied to the API", async ({ request }) => {
  const response = await request.get("/api/health", {
    headers: { "X-Request-ID": "e2e-proxy-check" },
  });

  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({ status: "ok" });
  expect(response.headers()["x-request-id"]).toBe("e2e-proxy-check");
});

test("API errors come back in the standard shape", async ({ request }) => {
  const response = await request.get("/api/does-not-exist");

  expect(response.status()).toBe(404);
  expect(await response.json()).toMatchObject({
    error: { code: "not_found", request_id: expect.any(String) },
  });
});
