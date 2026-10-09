import { Suspense } from "react";
import { ContractDetail } from "@/features/sharing/components/contract-detail";
async function ContractContent({params}:{params:Promise<{id:string}>}) { const {id}=await params;return <ContractDetail id={Number(id)} />; }
export default function ContractPage(props:{params:Promise<{id:string}>}) { return <Suspense fallback={<p role="status">계약을 준비하고 있습니다…</p>}><ContractContent {...props} /></Suspense>; }
