"use client";
import { useEffect, useRef } from "react";
import { errorMessage } from "@/lib/api-client";
export function VehicleDeleteDialog({ pending, error, onCancel, onConfirm }: { pending: boolean; error: unknown; onCancel: () => void; onConfirm: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const element = dialog.current; if (element && !element.open) element.showModal(); }, []);
  return <dialog ref={dialog} className="vehicle-delete-dialog sharing-panel" aria-label="차량 삭제 확인" onCancel={event => { if (pending) event.preventDefault(); }} onClose={onCancel}>
    <h3>차량을 삭제할까요?</h3><p>내 차량과 공개 목록에서 제외됩니다. 과거 계약과 보안 이력은 보존됩니다.</p><p>종료 전인 요청이나 계약이 있으면 삭제할 수 없습니다.</p>
    {Boolean(error) && <p role="alert" className="form-error">{errorMessage(error)}</p>}
    <div className="sharing-actions"><button autoFocus disabled={pending} onClick={() => dialog.current?.close()}>취소</button><button disabled={pending} onClick={onConfirm}>{pending ? "삭제 중…" : "삭제 확인"}</button></div>
  </dialog>;
}
