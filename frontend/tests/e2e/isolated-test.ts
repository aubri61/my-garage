import { randomBytes } from "node:crypto";
import { test as base, expect } from "@playwright/test";
export { expect };
export const test = base.extend<{ isolatedData: void }>({
  isolatedData: [async ({ request }, provide, info) => {
    const root = process.env.E2E_RUN_ID!;
    const runId = info.title.includes("PKI") && process.env.RUN_LIVE_PKI === "1" ? process.env.E2E_PKI_RUN_ID! : randomBytes(16).toString("hex");
    if (!/^[a-f0-9]{32}$/.test(runId)) throw new Error("E2E_PKI_RUN_ID must be a fresh 32-character hexadecimal namespace for the certificate email.");
    process.env.E2E_RUN_ID = runId;
    try { await provide(); }
    finally {
      process.env.E2E_RUN_ID = root;
      const response = await request.post("/api/test-support/cleanup", { headers: { "X-E2E-Token": process.env.E2E_TOKEN! }, data: { runId } });
      expect(response.ok(), `Cleanup failed; retained isolated namespace: ${runId}`).toBeTruthy();
    }
  }, { auto: true }],
});
