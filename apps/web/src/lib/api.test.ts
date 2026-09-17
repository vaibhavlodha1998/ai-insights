import { beforeEach, expect, test, vi } from "vitest";

// API_URL is read when the module loads, so import it fresh after stubbing env
async function loadApi() {
  vi.resetModules();
  return import("./api");
}

beforeEach(() => {
  vi.stubEnv("API_URL", "http://api.test");
});

test("apiFetch calls API_URL without caching", async () => {
  const fetchMock = vi.fn().mockResolvedValue(new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  const { apiFetch } = await loadApi();

  await apiFetch("/health");

  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe("http://api.test/health");
  expect(init.cache).toBe("no-store");
  expect(init.signal).toBeInstanceOf(AbortSignal);
});

test("getReadiness returns the report, including when the API answers 503", async () => {
  const report = {
    status: "unavailable",
    checks: { database: "ok", redis: "unavailable" },
  };
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(Response.json(report, { status: 503 })),
  );
  const { getReadiness } = await loadApi();

  expect(await getReadiness()).toEqual(report);
});

test("getReadiness returns null when the API is unreachable", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
  const { getReadiness } = await loadApi();

  expect(await getReadiness()).toBeNull();
});
