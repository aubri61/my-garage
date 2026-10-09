import { randomBytes } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import type { FullConfig } from "@playwright/test";
export default async function setup(config: FullConfig) {
  if (!process.env.E2E_TOKEN || process.env.E2E_TOKEN.length < 32) throw new Error("E2E_TOKEN is required. Run the isolated E2E backend first.");
  const base = config.projects[0].use.baseURL as string;
  const response = await fetch(`${base}/api/test-support/environment`, { headers: { "X-E2E-Token": process.env.E2E_TOKEN } });
  if (!response.ok) throw new Error("E2E blocked: frontend proxy does not reach a verified isolated backend.");
  const data = await response.json();
  if (data.profile !== "e2e" || data.identity?.database !== "mygarage_e2e" || data.identity?.username !== "mygarage_e2e" || data.identity?.superuser !== false) throw new Error("E2E blocked: development or unverified database.");
  process.env.E2E_RUN_ID = randomBytes(16).toString("hex");
  // Issue only an offline fixture for this isolated run, using the configured test CA.
  if (process.env.RUN_LIVE_PKI === "1" && !process.env.PKI_TEST_EMAIL) {
    if (!process.env.PKI_FIXTURE_DIR) throw new Error("PKI_FIXTURE_DIR is required for the offline PKI test.");
    process.env.E2E_PKI_RUN_ID = process.env.E2E_RUN_ID;
    process.env.PKI_TEST_EMAIL = `e2e-${process.env.E2E_RUN_ID}-pki@example.com`;
    execFileSync("sh", [path.resolve("../scripts/create-test-device.sh"), process.env.PKI_FIXTURE_DIR, process.env.PKI_TEST_EMAIL, "browser-device"], { stdio: "ignore" });
  }
}
