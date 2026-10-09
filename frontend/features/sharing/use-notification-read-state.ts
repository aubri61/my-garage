"use client";
import { useSyncExternalStore } from "react";
// Client-only acknowledgement, scoped to the account and this browser tab.
// Store state fingerprints, never credentials or full rental/notification records.
const empty: ReadonlySet<string> = new Set();
const snapshots = new Map<number, ReadonlySet<string>>();
const listeners = new Set<() => void>();
const storageKey = (userId: number) => `my-garage:notification-read:${userId}`;
export function useNotificationReadState(userId: number | undefined) {
  function subscribe(listener: () => void) {
    if (userId && !snapshots.has(userId)) {
      let keys: string[] = [];
      try {
        const stored: unknown = JSON.parse(sessionStorage.getItem(storageKey(userId)) ?? "[]");
        if (Array.isArray(stored) && stored.every(item => typeof item === "string")) keys = stored;
      } catch { /* Storage denial/corruption keeps acknowledgement in memory. */ }
      snapshots.set(userId, new Set(keys));
    }
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
  const read = useSyncExternalStore(subscribe, () => userId ? snapshots.get(userId) ?? empty : empty, () => empty);
  function acknowledge(keys: string[]) {
    if (!userId) return;
    const next = new Set([...(snapshots.get(userId) ?? empty), ...keys]);
    snapshots.set(userId, next);
    try { sessionStorage.setItem(storageKey(userId), JSON.stringify([...next])); } catch { /* In-memory mode still works. */ }
    listeners.forEach(listener => listener());
  }
  return { read, acknowledge };
}
