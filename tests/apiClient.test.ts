// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiClient } from "../src/lib/apiClient";

describe("ApiClient", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("surfaces server JSON errors from failed requests", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "Photo extraction failed: load failed" }), {
        status: 502,
        statusText: "Bad Gateway",
        headers: {
          "Content-Type": "application/json",
        },
      }),
    );

    const client = new ApiClient(() => "token");

    await expect(client.extractPhoto("data:image/png;base64,abc")).rejects.toThrow(
      "HTTP 502: Photo extraction failed: load failed",
    );
  });

  it("annotates network failures with the request URL", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("load failed"));

    const client = new ApiClient(() => "token");

    await expect(client.extractPhoto("data:image/png;base64,abc")).rejects.toThrow(
      /Network request to .*\/api\/extract-photo failed: load failed/,
    );
  });

  it("rejects successful responses that are not valid JSON", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("<html>not-json</html>", {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }),
    );

    const client = new ApiClient(() => "token");

    await expect(client.bootstrap()).rejects.toThrow("Invalid JSON response from /api/bootstrap");
  });
});
