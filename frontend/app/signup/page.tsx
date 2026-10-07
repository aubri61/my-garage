import { AccountShell } from "@/components/layout/account-shell";
import { AuthForm } from "@/features/auth/components/auth-form";
export default function SignupPage() {
  return <AccountShell title="My Garage 회원가입" description="내 차량과 연결되는 일상, 여기서 시작하세요."><AuthForm mode="signup" /></AccountShell>;
}
