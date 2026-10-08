"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FormField } from "@/components/ui/form-field";
import type { AuthErrors, SignupValues } from "@/features/auth/types";
import { validateLogin, validateSignup } from "@/features/auth/validation";
import { login, signup as createAccount } from "@/services/garage-api";
import { useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/api-client";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const { bfcacheId } = useRouter();
  return <AuthFields key={`${mode}-${bfcacheId}`} mode={mode} />;
}

function AuthFields({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const client = useQueryClient();
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
      if (signup) {
        await createAccount({ name: values.name.trim(), email: values.email.trim(), password: values.password }, controller.signal);
      } else {
        const user = await login({ email: values.email.trim(), password: values.password }, controller.signal);
        controller.signal.throwIfAborted();
        await client.cancelQueries();
        client.clear();
        client.setQueryData(["session"], user);
      }
      controller.signal.throwIfAborted();
      setValues({ name: "", email: "", password: "", passwordConfirmation: "" });
      setStatus("success");
      if (!signup) router.replace("/garage");
    } catch (error) {
      if (controller.signal.aborted) return;
      setStatus("error"); setMessage(errorMessage(error));
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  if (status === "success" && signup) return <section className="flow-success" aria-labelledby="signup-success-title">
    <span className="success-mark" aria-hidden="true">✓</span><h2 id="signup-success-title" tabIndex={-1} ref={element => element?.focus()}>가입이 완료되었습니다.</h2>
    <p>계정이 생성되었습니다. 로그인 후 내 차량을 등록하세요.</p>
    <Link href="/login" className="form-submit">로그인하기</Link>
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
    {!signup && <button type="button" className="form-secondary" disabled={status === "pending"} onClick={() => router.push("/demo")}>데모 화면 체험</button>}
    <p className="auth-alternate">{signup ? "이미 시작하셨나요?" : "처음 방문하셨나요?"} <Link href={signup ? "/login" : "/signup"}>{signup ? "로그인" : "회원가입"}</Link></p>
    <p className="mock-disclosure">{signup ? "서버에 계정을 생성합니다. 비밀번호는 브라우저에 저장하지 않습니다." : "서버 세션으로 로그인합니다. 데모 화면은 실제 계정 및 차량 데이터와 분리되어 있습니다."}</p>
  </>;
}
