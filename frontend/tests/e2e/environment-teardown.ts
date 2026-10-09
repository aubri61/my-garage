import type { FullConfig } from "@playwright/test";
export default async function teardown(config: FullConfig) {
  if (!process.env.E2E_RUN_ID) return;
  const response = await fetch(`${config.projects[0].use.baseURL}/api/test-support/cleanup`, {
    method: "POST", headers: { "Content-Type": "application/json", "X-E2E-Token": process.env.E2E_TOKEN! }, body: JSON.stringify({ runId: process.env.E2E_RUN_ID }),
  });
  if (!response.ok) throw new Error(`Isolated test cleanup failed (${response.status}). Retained run: ${process.env.E2E_RUN_ID}`);
}
