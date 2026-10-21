const P: Record<string, JSX.Element> = {
  play: <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" /><circle cx="17" cy="9" r="2.4" /><path d="M16.5 14.2c2.7.2 4.5 2.3 4.5 5" /></>,
  key: <><circle cx="8" cy="12" r="3.5" /><path d="M11.5 12H21M17 12v3M20 12v2" /></>,
  phone: <><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 12.5l9 5 9-5" /><path d="M3 16.5l9 5 9-5" /></>,
  sliders: <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>,
  trophy: <><path d="M7 4h10v5a5 5 0 01-10 0z" /><path d="M7 6H4v1.5A3.5 3.5 0 007.5 11M17 6h3v1.5A3.5 3.5 0 0116.5 11" /><path d="M12 14v4M8 21h8M9.5 18h5" /></>,
  ball: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5l3.6 2.6-1.4 4.2H9.8L8.4 10.1z" /><path d="M12 7.5V3M15.6 10.1l4.2-1.4M14.2 14.3l2.6 3.6M9.8 14.3l-2.6 3.6M8.4 10.1L4.2 8.7" /></>,
  volume: <><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" /><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 018 0v3" /></>,
  target: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M3 15h18M8 4v16M16 4v16" /></>,
};

export default function Icon({ name, size = 24, className }: { name: keyof typeof P; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>{P[name]}</svg>
  );
}
