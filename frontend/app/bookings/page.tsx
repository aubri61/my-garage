import { Suspense } from "react";
import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { RentalList } from "@/features/sharing/components/rental-list";
async function BookingsContent({ searchParams }: { searchParams: Promise<{ mode?: string }> }) { const mode = (await searchParams).mode === "owner" ? "owner" : "renter"; return <SharingShell mode={mode} title="예약·계약"><RentalList mode={mode} /></SharingShell>; }
export default function BookingsPage(props: { searchParams: Promise<{ mode?: string }> }) { return <Suspense fallback={<p role="status">예약 화면을 준비하고 있습니다…</p>}><BookingsContent {...props} /></Suspense>; }
