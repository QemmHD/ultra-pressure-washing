import { describe, expect, test } from "bun:test";
import { readBoundedRequestText } from "../../netlify/functions/_shared/bounded-body";

describe("bounded request reader", () => {
  test("accepts valid UTF-8 without a Content-Length header", async () => {
    const request = new Request("https://example.test/api/quote", {
      method: "POST",
      body: JSON.stringify({ message: "East Tennessee" }),
    });

    expect(request.headers.get("content-length")).toBeNull();
    expect(await readBoundedRequestText(request, 1_024)).toEqual({
      ok: true,
      text: JSON.stringify({ message: "East Tennessee" }),
    });
  });

  test("stops a chunked body as soon as the byte limit is crossed", async () => {
    let producedChunks = 0;
    let cancelled = false;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        producedChunks += 1;
        controller.enqueue(new Uint8Array(600));
        if (producedChunks >= 10) controller.close();
      },
      cancel() {
        cancelled = true;
      },
    });
    const request = new Request("https://example.test/api/quote", {
      method: "POST",
      body: stream,
    });

    expect(await readBoundedRequestText(request, 1_024)).toEqual({
      ok: false,
      reason: "too_large",
    });
    expect(cancelled).toBe(true);
    expect(producedChunks).toBeLessThan(10);
  });

  test("rejects malformed or oversized declared lengths before reading", async () => {
    for (const contentLength of ["-1", "not-a-number", "2048"]) {
      const request = new Request("https://example.test/api/quote", {
        method: "POST",
        headers: { "Content-Length": contentLength },
        body: "{}",
      });
      const result = await readBoundedRequestText(request, 1_024);
      expect(result.ok).toBe(false);
    }
  });
});
