import { GarageDashboard } from "@/features/garage/components/garage-dashboard";
import { mockGarageDashboard } from "@/mocks/garage";

export default function GaragePage() {
  return (
    <GarageDashboard
      data={mockGarageDashboard}
      serviceAvailability={{ updates: false, charging: false }}
    />
  );
}
