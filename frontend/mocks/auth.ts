import type { LoginValues, SignupValues } from "@/features/auth/types";
import { validateLogin, validateSignup } from "@/features/auth/validation";
import { mockLatency } from "@/mocks/latency";

// No accounts, passwords or tokens are persisted or authenticated by these mocks.
export async function mockSignup(values: SignupValues, signal: AbortSignal) {
  await mockLatency(signal);
  if (Object.keys(validateSignup(values)).length) throw new Error("입력 정보를 확인해주세요.");
  return { displayName: values.name.trim() };
}

export async function mockLogin(values: LoginValues, signal: AbortSignal) {
  await mockLatency(signal);
  if (Object.keys(validateLogin(values)).length) throw new Error("입력 정보를 확인해주세요.");
  return { displayName: "회원" };
}
