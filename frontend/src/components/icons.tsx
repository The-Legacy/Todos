import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 18, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...props,
  };
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function TodayIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.2 4.2l1.6 1.6M18.2 18.2l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.2 19.8l1.6-1.6M18.2 5.8l1.6-1.6" />
    </svg>
  );
}

export function WeekIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4.5" width="18" height="16" rx="2.2" />
      <path d="M3 9.5h18M8 3v3M16 3v3" />
    </svg>
  );
}

export function BacklogIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 8.5h17M4.5 8.5l1 9.2a2 2 0 0 0 2 1.8h9a2 2 0 0 0 2-1.8l1-9.2M9.5 12.2h5" />
    </svg>
  );
}

export function ProjectsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 6.2a1.6 1.6 0 0 1 1.6-1.6h4.2l1.9 2.2h8a1.6 1.6 0 0 1 1.6 1.6v9.8a1.6 1.6 0 0 1-1.6 1.6H5.1a1.6 1.6 0 0 1-1.6-1.6z" />
    </svg>
  );
}

export function RecurringIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 12a8 8 0 0 1 13.6-5.7L20 8.5M20 12a8 8 0 0 1-13.6 5.7L4 15.5M20 4.5v4h-4M4 19.5v-4h4" />
    </svg>
  );
}

export function TasksIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8.2 12.3l2.4 2.4 5.2-5.4" />
    </svg>
  );
}

export function CategoriesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11.3 3.5h-5A2.3 2.3 0 0 0 4 5.8v5l9.3 9.3a2 2 0 0 0 2.9 0l4.9-4.9a2 2 0 0 0 0-2.9z" />
      <circle cx="8.4" cy="9.4" r="1.3" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 13.6a1.7 1.7 0 0 0 .35 1.9l.06.06a2.1 2.1 0 1 1-3 3l-.06-.06a1.7 1.7 0 0 0-1.9-.35 1.7 1.7 0 0 0-1 1.55V20a2.1 2.1 0 0 1-4.2 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.9.35l-.06.06a2.1 2.1 0 1 1-3-3l.06-.06a1.7 1.7 0 0 0 .35-1.9 1.7 1.7 0 0 0-1.55-1H4a2.1 2.1 0 0 1 0-4.2h.1A1.7 1.7 0 0 0 5.65 9a1.7 1.7 0 0 0-.35-1.9l-.06-.06a2.1 2.1 0 1 1 3-3l.06.06a1.7 1.7 0 0 0 1.9.35H10.2a1.7 1.7 0 0 0 1-1.55V4a2.1 2.1 0 0 1 4.2 0v.1a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.9-.35l.06-.06a2.1 2.1 0 1 1 3 3l-.06.06a1.7 1.7 0 0 0-.35 1.9V10.2a1.7 1.7 0 0 0 1.55 1H20a2.1 2.1 0 0 1 0 4.2h-.1a1.7 1.7 0 0 0-1.55 1z" />
    </svg>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 17l5-5-5-5M20 12H9M12 19H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
    </svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 3, ...props })}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export function DragHandleIcon({ size = 10, ...props }: IconProps) {
  return (
    <svg width={size} height={(size * 24) / 10} viewBox="0 0 10 24" fill="currentColor" {...props}>
      <circle cx="2.5" cy="4" r="1.5" />
      <circle cx="7.5" cy="4" r="1.5" />
      <circle cx="2.5" cy="12" r="1.5" />
      <circle cx="7.5" cy="12" r="1.5" />
      <circle cx="2.5" cy="20" r="1.5" />
      <circle cx="7.5" cy="20" r="1.5" />
    </svg>
  );
}

export function FlagIcon({ size = 13, ...props }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M5 3v18M5 4h11l-2.2 3.4L16 10.8H5" />
    </svg>
  );
}

export function XIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.2, ...props })}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}
