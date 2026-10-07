"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import type { AuthErrors, SignupValues } from "@/features/auth/types";
import { validateLogin, validateSignup } from "@/features/auth/validation";
import { mockLogin, mockSignup } from "@/mocks/auth";
import { startDemoSession, startMemberSession } from "@/mocks/demo-session";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { bfcacheId } = useRouter();
  return <AuthFields key={`${mode}-${bfcacheId}`} mode={mode} />;
}

function AuthFields({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const signup = mode === "signup";
  const [values, setValues] = useState<SignupValues>({ name: "", email: "", password: "", passwordConfirmation: "" });
  const [errors, setErrors] = useState<AuthErrors>({});
  const [status, setStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    request.current = null;
    setStatus(previous => previous === "pending" ? "idle" : previous);
  }, []);

  function change(field: keyof SignupValues, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "pending" || request.current) return;
    const form = event.currentTarget;
    const validation = signup ? validateSignup(values) : validateLogin(values);
    setErrors(validation);
    const firstInvalid = (["name", "email", "password", "passwordConfirmation"] as const).find(field => validation[field]);
    if (firstInvalid) { (form.elements.namedItem(firstInvalid) as HTMLInputElement | null)?.focus(); return; }
    const controller = new AbortController();
    request.current = controller;
    setStatus("pending");
    try {
      const result = await (signup ? mockSignup(values, controller.signal) : mockLogin(values, controller.signal));
      controller.signal.throwIfAborted();
      startMemberSession(result.displayName, signup);
      setValues({ name: "", email: "", password: "", passwordConfirmation: "" });
      setStatus("success");
      if (!signup) router.replace("/garage");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error"); setMessage(error instanceof Error ? error.message : "다시 시도해주세요.");
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  if (status === "success" && signup) return <section className="flow-success" aria-labelledby="signup-success-title">
    <span className="success-mark" aria-hidden="true">✓</span><h2 id="signup-success-title" tabIndex={-1} ref={element => element?.focus()}>가입이 완료되었습니다.</h2>
    <p>이제 내 차량을 연결해보세요.<br />아직 등록된 차량은 없습니다.</p>
    <p className="field-hint">데모 가입이며 실제 계정은 생성되지 않았습니다.</p>
    <Link href="/garage" className="form-submit">내 차고지로 이동</Link>
  </section>;

  return <>
    <form onSubmit={submit} noValidate aria-busy={status === "pending"}>
      <fieldset className="form-fields" disabled={status === "pending"}>
        <legend className="sr-only">{signup ? "회원가입 정보" : "로그인 정보"}</legend>
        {signup && <FormField name="name" label="이름" value={values.name} onChange={value => change("name", value)} error={errors.name} autoComplete="name" maxLength={30} />}
        <FormField name="email" label="이메일" type="email" value={values.email} onChange={value => change("email", value)} error={errors.email} autoComplete="email" maxLength={254} />
        <FormField name="password" label="비밀번호" type="password" value={values.password} onChange={value => change("password", value)} error={errors.password} autoComplete={signup ? "new-password" : "current-password"} hint="8자 이상 입력해주세요." maxLength={128} />
        {signup && <FormField name="passwordConfirmation" label="비밀번호 확인" type="password" value={values.passwordConfirmation} onChange={value => change("passwordConfirmation", value)} error={errors.passwordConfirmation} autoComplete="new-password" maxLength={128} />}
      </fieldset>
      {status === "error" && <p className="form-error" role="alert">{message}</p>}
      <button type="submit" className="form-submit" disabled={status === "pending"}>{status === "pending" ? signup ? "가입 처리 중…" : "로그인 중…" : signup ? "회원가입" : "로그인"}</button>
      <p role="status" className="sr-only">{status === "pending" ? "요청을 처리하고 있습니다." : ""}</p>
    </form>
    {!signup && <button type="button" className="form-secondary" disabled={status === "pending"} onClick={() => { startDemoSession(); router.push("/garage"); }}>데모 계정으로 시작</button>}
    <p className="auth-alternate">{signup ? "이미 시작하셨나요?" : "처음 방문하셨나요?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "로그인" : "회원가입"}</Link></p>
    <p className="mock-disclosure">{signup ? "입력 형식을 확인하는 데모입니다. 실제 계정은 생성하지 않으며 비밀번호를 저장하지 않습니다." : "입력 형식만 확인하는 데모 로그인입니다. 실제 계정 인증은 수행하지 않습니다. 데모 계정으로 시작하면 세 차량을 바로 볼 수 있습니다."}</p>
  </>;
}
