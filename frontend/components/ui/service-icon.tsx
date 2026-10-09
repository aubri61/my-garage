type ServiceIconProps = {
  name: "vehicle" | "shield" | "charging" | "climate" | "lock" | "heating" | "dashboard" | "calendar" | "plus" | "bell";
  className?: string;
};

export function ServiceIcon({ name, className }: ServiceIconProps) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === "bell" && <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></>}
      {name === "dashboard" && <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>}
      {name === "calendar" && <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4M17 3v4M3 10h18M7 14h3M7 17h6" /></>}
      {name === "plus" && <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>}
      {name === "vehicle" && <><path d="m5 7 2-3h10l2 3 2 5v6H3v-6l2-5Z" /><path d="M5 7h14M3 12h18M7 16h.01M17 16h.01M5 18v2M19 18v2" /></>}
      {name === "shield" && <><path d="m12 2 8 3v6c0 5-8 10-8 10S4 16 4 11V5l8-3Z" /><path d="m8.5 11.5 2.5 2.5 4.5-5" /></>}
      {name === "charging" && <><path d="M4 21V5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v16M2 21h15M18 4l3 3v10a2 2 0 0 1-4 0v-5h-2" /><path d="m10 6-3 4h4l-3 4" /></>}
      {name === "climate" && <><circle cx="12" cy="12" r="2" /><path d="M12 10c-4-6-9-2-6 1l4 1M14 12c6-4 2-9-1-6l-1 4M12 14c4 6 9 2 6-1l-4-1M10 12c-6 4-2 9 1 6l1-4" /></>}
      {name === "lock" && <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>}
      {name === "heating" && <><path d="M6 21c-5-6 5-8 0-14M12 21c-5-6 5-8 0-14M18 21c-5-6 5-8 0-14" /></>}
    </svg>
  );
}
