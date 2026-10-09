import { Suspense } from "react";
import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { PkiSecurityLab } from "@/features/sharing/components/pki-security-lab";
async function Lab({ searchParams }: { searchParams: Promise<{ rentalId?: string }> }) {
  const id = Number((await searchParams).rentalId);
  return <SharingShell mode="renter" title="보안 실험실"><PkiSecurityLab initialRentalId={Number.isSafeInteger(id) && id > 0 ? id : undefined} /></SharingShell>;
}
export default function SecurityLabPage(props: { searchParams: Promise<{ rentalId?: string }> }) {
  return <Suspense fallback={<p role="status">보안 실험실을 준비하고 있습니다…</p>}><Lab {...props} /></Suspense>;
}
