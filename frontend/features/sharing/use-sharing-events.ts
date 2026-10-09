"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/garage-api";

export function useSharingEvents(userId: number | undefined) {
  const client = useQueryClient();
  const [notification, setNotification] = useState<{ userId: number | undefined; text: string }>({ userId: undefined, text: "" });
  const [status, setStatus] = useState("실시간 연결 준비 중");
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let source: EventSource | null = null;
    const seen = new Set<string>();
    const pendingKeys = new Set<string>();
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    function refresh(keys = ["rentals", "vehicles", "available-vehicles"]) {
      keys.forEach(key => pendingKeys.add(key));
      if (refreshTimer) return;
      refreshTimer = setTimeout(() => {
        refreshTimer = undefined;
        if (disposed) return;
        pendingKeys.forEach(key => {
          // Cancel an initial fetch too: invalidation alone can retain its pre-event result.
          void client.cancelQueries({ queryKey: [key] }).then(() => {
            if (!disposed) return client.invalidateQueries({ queryKey: [key] });
          });
        });
        pendingKeys.clear();
      }, 50);
    }
    function duplicate(event: MessageEvent) {
      if (!event.lastEventId) return false;
      if (seen.has(event.lastEventId)) return true;
      seen.add(event.lastEventId);
      if (seen.size > 500) seen.delete(seen.values().next().value!);
      return false;
    }
    function connect() {
      source?.close();
      const connection = new EventSource("/api/notifications/stream", { withCredentials: true });
      source = connection;
      connection.addEventListener("ready", () => {
        if (disposed || source !== connection) return;
        setStatus("실시간 연결됨"); refresh();
      });
      connection.addEventListener("change", event => {
        if (disposed || source !== connection || duplicate(event as MessageEvent)) return;
        refresh();
        try {
          const payload = JSON.parse((event as MessageEvent).data) as { action: string; rentalId: number };
          const labels: Record<string, string> = { RENTAL_REQUESTED: "새 대여 요청", RENTAL_APPROVED: "대여 승인", RENTAL_REJECTED: "대여 거절", CONSENT_RECORDED: "계약 동의 반영", GRANT_ACTIVE: "접근 권한 활성", UNLOCK_REQUESTED: "잠금 해제 요청", UNLOCK_APPROVED: "잠금 해제 승인", GRANT_REVOKED: "접근 권한 회수", RENTAL_COMPLETED: "대여 종료" };
          setNotification({ userId, text: `${labels[payload.action] ?? "대여 상태 변경"} · 내 대여 요청에서 확인해주세요.` });
        } catch { /* REST refresh remains authoritative for an unrecognized hint. */ }
      });
      connection.addEventListener("inventory", event => { if (!disposed && source === connection && !duplicate(event as MessageEvent)) refresh(["available-vehicles"]); });
      connection.addEventListener("vehicles", event => { if (!disposed && source === connection && !duplicate(event as MessageEvent)) refresh(["vehicles"]); });
      connection.onerror = () => {
        if (disposed || source !== connection) return;
        setStatus("재연결 중 · 주기적으로 서버 상태를 확인합니다");
        // EventSource hides HTTP errors. REST handles expired sessions.
        void getCurrentUser().then(user => {
          if (!disposed && source === connection && !user) { connection.close(); client.setQueryData(["session"], null); }
        }).catch(() => { /* Query refresh exposes connectivity errors. */ });
      };
    }
    function offline() {
      source?.close(); source = null;
      setStatus("재연결 중 · 네트워크 연결을 기다립니다");
    }
    function online() { connect(); refresh(); }
    connect();
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      disposed = true; source?.close(); clearTimeout(refreshTimer);
      window.removeEventListener("offline", offline); window.removeEventListener("online", online);
    };
  }, [userId, client]);
  return { connection: status, notification: notification.userId === userId ? notification.text : "" };
}
