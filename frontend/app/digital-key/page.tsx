import { Suspense } from "react";
import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { RentalList } from "@/features/sharing/components/rental-list";
async function DigitalKeys({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  const mode=(await searchParams).mode === "owner" ? "owner" : "renter";
  return <SharingShell mode={mode} title="디지털 키"><section className="sharing-panel"><h2>내 디지털 키</h2><p>양측 계약 동의 후 대여 기간에 활성화됩니다. 소유자가 문 열기 요청을 승인하면 가상 잠금 상태가 변경됩니다. 차량 문 잠그기는 소유자가 관리합니다.</p><p className="sharing-disclosure">실제 차량 원격 제어가 아닌 시뮬레이션입니다.</p></section><RentalList mode={mode} keysOnly /></SharingShell>;
}
export default function DigitalKeyPage(props:{searchParams:Promise<{mode?:string}>}) {return <Suspense fallback={<p role="status">디지털 키를 확인하고 있습니다…</p>}><DigitalKeys {...props}/></Suspense>;}
