import axios from "axios";

export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export const api = axios.create({ baseURL: "/api", withCredentials: true, withXSRFToken: false, timeout: 15000 });

// Fetch the response token for every mutation. Spring's cookie contains a different,
// raw representation; Axios must not replace the masked response token with that value.
api.interceptors.request.use(async config => {
  if (["post", "put", "patch", "delete"].includes(config.method?.toLowerCase() ?? "")) {
    const { data } = await api.get<{ token: string }>("/csrf", { signal: config.signal });
    config.headers.set("X-XSRF-TOKEN", data.token);
  }
  return config;
});

api.interceptors.response.use(response => response, error => {
  if (axios.isCancel(error) || error instanceof ApiError) return Promise.reject(error);
  if (!axios.isAxiosError<{ code?: string; message?: string }>(error)) return Promise.reject(error);
  const status = error.response?.status ?? 0;
  const authenticationRequest = ["/auth/login", "/users/signup", "/csrf"].includes(error.config?.url ?? "");
  if (status === 401 && !authenticationRequest && typeof window !== "undefined") {
    window.dispatchEvent(new Event("my-garage:session-expired"));
  }
  const message = status === 403 && error.response?.data?.code === "FORBIDDEN"
    ? `${error.response?.data?.message ?? "접근이 제한되었습니다."} CSRF 오류라면 다시 요청해주세요.`
    : status === 401 && !authenticationRequest ? "로그인이 필요하거나 세션이 만료되었습니다."
    : error.response?.data?.message ?? "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.";
  return Promise.reject(new ApiError(status, error.response?.data?.code ?? "CONNECTION_ERROR", message));
});

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message
    : error instanceof Error ? error.message : "다시 시도해주세요.";
}
