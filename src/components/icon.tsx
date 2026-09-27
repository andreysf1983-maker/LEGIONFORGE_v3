import type { ReactNode } from "react";

export type IconName =
  | "grid" | "sliders" | "box" | "bag" | "database" | "terminal" | "play" | "refresh" | "shield" | "users"
  | "coin" | "cpu" | "check" | "clock" | "chevron" | "bell" | "search" | "save" | "download" | "sparkles"
  | "wand" | "sword" | "bot" | "plus" | "trash" | "pencil" | "x" | "paw" | "gift" | "book" | "alert" | "external";

const paths: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  sliders: <><path d="M4 21v-7m0-4V3m8 18v-9m0-4V3m8 18v-5m0-4V3"/><path d="M1 14h6M9 8h6m2 8h6"/></>,
  box: <><path d="m21 8-9-5-9 5 9 5 9-5Z"/><path d="m3 8 9 5 9-5v8l-9 5-9-5Z"/><path d="M12 13v8"/></>,
  bag: <><path d="M6 8h12l1 13H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
  database: <><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/></>,
  terminal: <><path d="m4 7 4 4-4 4M11 16h8"/><rect x="2" y="3" width="20" height="18" rx="2"/></>,
  play: <path d="m8 5 11 7-11 7Z"/>,
  refresh: <><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 1 8"/></>,
  shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-5"/></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/></>,
  coin: <><circle cx="12" cy="12" r="9"/><path d="M15 8.5c-.7-.7-1.7-1-3-1-1.7 0-3 .8-3 2s1 1.8 3 2.5 3 1.2 3 2.5-1.3 2-3 2c-1.3 0-2.5-.4-3.2-1.2M12 5v14"/></>,
  cpu: <><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 1v3m6-3v3M9 20v3m6-3v3M20 9h3m-3 6h3M1 9h3m-3 6h3"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  chevron: <path d="m9 18 6-6-6-6"/>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></>,
  search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
  save: <><path d="M4 3h13l3 3v15H4Z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/></>,
  download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M4 20h16"/></>,
  sparkles: <><path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14Z"/></>,
  wand: <><path d="m15 4 5 5L8 21l-5-5Z"/><path d="m14 5 5 5M5 4v3M3.5 5.5h3M19 16v4m-2-2h4"/></>,
  sword: <><path d="m14 5 5-3 3 3-3 5-8 8-5-5Z"/><path d="m5 12-3 3 7 7 3-3M14 5l5 5"/></>,
  bot: <><rect x="4" y="7" width="16" height="13" rx="3"/><path d="M12 7V3m-3 9h.01M15 12h.01M8 16h8"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  trash: <><path d="M3 6h18M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></>,
  pencil: <><path d="M17 3l4 4L7 21H3v-4Z"/><path d="m14 6 4 4"/></>,
  x: <path d="M18 6 6 18M6 6l12 12"/>,
  paw: <><circle cx="5.5" cy="10" r="2"/><circle cx="9" cy="5.5" r="2"/><circle cx="15" cy="5.5" r="2"/><circle cx="18.5" cy="10" r="2"/><path d="M8 17c0-2.8 1.8-5 4-5s4 2.2 4 5c0 1.7-1.3 3-3 3h-2c-1.7 0-3-1.3-3-3Z"/></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13M5 12v9h14v-9"/><path d="M7.5 8a2.5 2.5 0 1 1 0-5C10 3 12 8 12 8s2-5 4.5-5a2.5 2.5 0 1 1 0 5"/></>,
  book: <><path d="M4 19.5V5a2 2 0 0 1 2-2h14v16H6a2 2 0 0 0-2 2Z"/><path d="M8 7h8M8 11h6"/></>,
  alert: <><path d="M12 3 2 21h20Z"/><path d="M12 10v4M12 17.5h.01"/></>,
  external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/></>,
};

export function Icon({ name, size = 18, className = "" }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
