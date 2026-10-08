"use client";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getCurrentUser } from "@/services/garage-api";

export function useSharingEvents(userId: number | undefined) {
  const client = useQueryClient();
  const [status, setStatus] = useState("실시간 연결 준비 중");
  useEffect(() => {
    if (!userId) return;
    let disposed = false;
    let source: EventSource | null = null;
    function refresh() {
      for (const key of ["rentals", "vehicles", "available-vehicles"]) void client.invalidateQueries({ queryKey: [key] });
    }
    function connect() {
      source?.close();
      const connection = new EventSource("/api/notifications/stream", { withCredentials: true });
      source = connection;
      connection.addEventListener("ready", () => {
        if (disposed || source !== connection) return;
        setStatus("실시간 연결됨"); refresh();
      });
      connection.addEventListener("change", () => { if (!disposed && source === connection) refresh(); });
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
      disposed = true; source?.close();
      window.removeEventListener("offline", offline); window.removeEventListener("online", online);
    };
  }, [userId, client]);
  return status;
}
