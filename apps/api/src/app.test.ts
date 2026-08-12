import { describe, expect, test } from "bun:test";
import { createApp } from "./app";

describe("API", () => {
  test("lists platform-owned feed definitions", async () => {
    const app = createApp();
    const response = await app.inject({ method: "GET", url: "/v1/feeds" });

    expect(response.statusCode).toBe(200);
    expect(response.json().items[0].id).toBe("ai-agent-deep-reviews");
    await app.close();
  });

  test("exposes the versioned participation policy", async () => {
    const app = createApp();
    const response = await app.inject({
      method: "GET",
      url: "/v1/policies/participation",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      audit: {
        access: "invitation_only",
        minimumIndependentReviews: 2,
      },
      recommendation: {
        baseDailyAllowance: 3,
        attributionBasis: "first_eligible_discovery",
      },
    });
    await app.close();
  });

  test("exposes the hierarchical knowledge taxonomy", async () => {
    const app = createApp();
    const response = await app.inject({ method: "GET", url: "/v1/taxonomy" });

    expect(response.statusCode).toBe(200);
    expect(response.json().version).toBe("taxonomy-v1");
    expect(response.json().items.length).toBeGreaterThanOrEqual(10);
    expect(
      response.json().items.find((item: { id: string }) => item.id === "artificial-intelligence")
        .freshnessPolicy.recentQueryShare,
    ).toBe(0.9);
    await app.close();
  });
});
