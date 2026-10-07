export type LoginValues = { email: string; password: string };
export type SignupValues = LoginValues & { name: string; passwordConfirmation: string };
export type AuthErrors = Partial<Record<keyof SignupValues, string>>;
