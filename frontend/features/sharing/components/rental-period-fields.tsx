"use client";
import { useEffect, useState } from "react";
import { initialRentalPeriod } from "../presentation";
export function useRentalDates() {
  const [dates, setDates] = useState({ start: "", end: "" });
  useEffect(() => {
    // Resolve the user's local clock after hydration, so cached HTML cannot show a stale time.
    const timer = window.setTimeout(() => setDates(initialRentalPeriod()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  return { ...dates, setStart: (start: string) => setDates(previous => ({ ...previous, start })), setEnd: (end: string) => setDates(previous => ({ ...previous, end })) };
}
export function RentalPeriodFields({ start, end, onStart, onEnd, browsing = false }: { start: string; end: string; onStart: (value: string) => void; onEnd: (value: string) => void; browsing?: boolean }) {
  return <div className="coordinate-grid"><label className="form-field">{browsing ? "조회 시작 시각" : "대여 시작 시각"}<input type="datetime-local" required value={start} onChange={event => onStart(event.target.value)} /></label><label className="form-field">{browsing ? "조회 종료 시각" : "대여 종료 시각"}<input type="datetime-local" required value={end} onChange={event => onEnd(event.target.value)} /></label></div>;
}
