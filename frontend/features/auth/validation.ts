import type { AuthErrors, LoginValues, SignupValues } from "./types";

export function validateLogin(values: LoginValues): AuthErrors {
  const errors: AuthErrors = {};
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = "올바른 이메일 주소를 입력해주세요.";
  if (values.password.length < 8) errors.password = "비밀번호는 8자 이상 입력해주세요.";
  return errors;
}

export function validateSignup(values: SignupValues): AuthErrors {
  const errors = validateLogin(values);
  if (!values.name.trim()) errors.name = "이름을 입력해주세요.";
  else if (values.name.trim().length > 30) errors.name = "이름은 30자 이내로 입력해주세요.";
  if (!values.passwordConfirmation) errors.passwordConfirmation = "비밀번호를 한 번 더 입력해주세요.";
  else if (values.password !== values.passwordConfirmation) errors.passwordConfirmation = "비밀번호가 일치하지 않습니다.";
  return errors;
}
