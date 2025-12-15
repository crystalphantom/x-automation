import { describe, it, expect } from "vitest";
import { formatUsageMetrics } from "./tracing.js";

describe("formatUsageMetrics", () => {
  it("should return empty object for undefined usage", () => {
    const result = formatUsageMetrics(undefined);
    expect(result).toEqual({});
  });

  it("should extract basic tokens using inputTokens/outputTokens", () => {
    const result = formatUsageMetrics({
      inputTokens: 100,
      outputTokens: 50,
    });

    expect(result.prompt_tokens).toBe(100);
    expect(result.completion_tokens).toBe(50);
    expect(result.total_tokens).toBe(150);
  });

  it("should extract basic tokens using promptTokens/completionTokens", () => {
    const result = formatUsageMetrics({
      promptTokens: 100,
      completionTokens: 50,
    });

    expect(result.prompt_tokens).toBe(100);
    expect(result.completion_tokens).toBe(50);
    expect(result.total_tokens).toBe(150);
  });

  it("should handle only input tokens", () => {
    const result = formatUsageMetrics({
      inputTokens: 100,
    });

    expect(result.prompt_tokens).toBe(100);
    expect(result.completion_tokens).toBeUndefined();
    expect(result.total_tokens).toBeUndefined();
  });

  it("should handle only output tokens", () => {
    const result = formatUsageMetrics({
      outputTokens: 50,
    });

    expect(result.prompt_tokens).toBeUndefined();
    expect(result.completion_tokens).toBe(50);
    expect(result.total_tokens).toBeUndefined();
  });

  it("should handle zero tokens", () => {
    const result = formatUsageMetrics({
      inputTokens: 0,
      outputTokens: 0,
    });

    expect(result.prompt_tokens).toBe(0);
    expect(result.completion_tokens).toBe(0);
    expect(result.total_tokens).toBe(0);
  });

  it("should use totalTokens if individual counts unavailable", () => {
    const result = formatUsageMetrics({
      totalTokens: 200,
    });

    expect(result.total_tokens).toBe(200);
  });
});
