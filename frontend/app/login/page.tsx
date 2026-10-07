import { AccountShell } from "@/components/layout/account-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
export default function LoginPage() {
  return <AccountShell title="My Garage 시작하기" description="로그인하고 내 차량의 다음 여정을 준비하세요."><AuthForm mode="login" /></AccountShell>;
}
