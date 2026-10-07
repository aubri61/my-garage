import { GarageDashboard } from "@/features/garage/components/garage-dashboard";
import { mockGarageDashboard } from "@/mocks/garage";

export default function GaragePage() {
  return <GarageDashboard data={mockGarageDashboard} actions={{
    updates: { href: "/updates/ev6-security-2026-01", available: false },
    charging: { href: "/charging", available: false },
  }} />;
}
