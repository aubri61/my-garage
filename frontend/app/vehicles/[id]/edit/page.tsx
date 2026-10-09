import { Suspense } from "react";
import { SharingShell } from "@/features/sharing/components/sharing-shell";
import { VehicleEditor } from "@/features/vehicle-registration/components/vehicle-editor";
async function EditContent({ params }: { params: Promise<{id:string}> }) { const {id}=await params; return <SharingShell mode="owner" title="차량 수정"><h2>내 차량 수정</h2><VehicleEditor id={Number(id)} /></SharingShell>; }
export default function VehicleEditPage(props:{params:Promise<{id:string}>}) { return <Suspense fallback={<p role="status">차량을 준비하고 있습니다…</p>}><EditContent {...props} /></Suspense>; }
