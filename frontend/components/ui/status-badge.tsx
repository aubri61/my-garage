type StatusBadgeProps = {
  children: React.ReactNode;
  tone: "success" | "warning" | "neutral";
};

export function StatusBadge({ children, tone }: StatusBadgeProps) {
  return <span className={`status-badge status-${tone}`}><span aria-hidden="true" className="status-dot" />{children}</span>;
}
