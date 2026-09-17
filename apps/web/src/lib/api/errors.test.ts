import { describe, expect, test } from "vitest";

import { asApiError, fieldErrors, isApiError, toApiError } from "./errors";

describe("toApiError", () => {
  test("reads the API's structured error body", () => {
    const error = toApiError({
      status: 422,
      data: {
        error: {
          code: "INVALID_LANGUAGE",
          message: "Target language is not supported",
          request_id: "req-1",
          details: [{ loc: ["body"], msg: "Target language is not supported" }],
        },
      },
    });

    expect(error).toEqual({
      status: 422,
      code: "INVALID_LANGUAGE",
      message: "Target language is not supported",
      requestId: "req-1",
      details: [{ loc: ["body"], msg: "Target language is not supported" }],
    });
  });

  test("handles responses without the error body", () => {
    expect(toApiError({ status: 502, data: "<html>Bad gateway</html>" })).toMatchObject({
      status: 502,
      code: "UNEXPECTED_ERROR",
    });
  });

  test("handles network failures", () => {
    expect(toApiError({ status: "FETCH_ERROR", error: "TypeError: Failed to fetch" })).toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    });
  });

  test("handles unparseable bodies", () => {
    expect(
      toApiError({ status: "PARSING_ERROR", originalStatus: 500, data: "oops", error: "bad json" }),
    ).toMatchObject({ status: 500, code: "UNEXPECTED_ERROR" });
  });
});

test("asApiError passes ApiErrors through and converts serialized errors", () => {
  const apiError = { status: 404, code: "NOT_FOUND", message: "Not Found", requestId: null, details: null };

  expect(asApiError(apiError)).toBe(apiError);
  expect(asApiError({ message: "boom" })).toMatchObject({ code: "UNEXPECTED_ERROR", message: "boom" });
  expect(asApiError(undefined)).toBeUndefined();
  expect(isApiError({ message: "boom" })).toBe(false);
});

test("fieldErrors lists validation problems by field", () => {
  const error = toApiError({
    status: 422,
    data: {
      error: {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        request_id: null,
        details: [
          { loc: ["body", "model"], msg: "Extra inputs are not permitted" },
          { loc: ["body"], msg: "Prompt is required" },
          "not an object",
        ],
      },
    },
  });

  expect(fieldErrors(error)).toEqual([
    { field: "model", message: "Extra inputs are not permitted" },
    { field: "body", message: "Prompt is required" },
  ]);
});
