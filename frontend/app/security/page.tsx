import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { SecurityDashboard } from "@/features/sharing/components/security-dashboard";
export default function SecurityPage() { return <SharingShell mode="owner" title="보안 검증"><SecurityDashboard /></SharingShell>; }
