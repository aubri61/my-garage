"use client";
import { useEffect, useRef, type ReactNode, type ButtonHTMLAttributes, type InputHTMLAttributes } from "react";
export function Button({ className = "", variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) { return <button className={`platform-button ${variant === "secondary" ? "secondary" : ""} ${className}`} {...props} />; }
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={`platform-input ${props.className ?? ""}`} />; }
export function StatusBadge({ children }: { children: ReactNode }) { return <span className="platform-badge">{children}</span>; }
export function LoadingSkeleton({ label = "불러오는 중…" }: { label?: string }) { return <div className="platform-skeleton" role="status"><span className="sr-only">{label}</span></div>; }
export function EmptyState({ title, description, children }: { title: string; description: string; children?: ReactNode }) { return <div className="platform-empty"><h3>{title}</h3><p>{description}</p>{children}</div>; }
export function Dialog({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} className="platform-dialog" aria-label={title} onCancel={event => { event.preventDefault(); onClose(); }}><div className="platform-dialog-heading"><h2>{title}</h2><Button variant="secondary" onClick={onClose}>닫기</Button></div>{children}</dialog>;
}
