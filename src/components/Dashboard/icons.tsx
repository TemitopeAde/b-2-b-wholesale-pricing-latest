import React, { type FC } from 'react';

type IconProps = { size?: number; className?: string };

const Svg: FC<IconProps & { children: React.ReactNode }> = ({ size = 18, className, children }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
        className={className}
    >
        {children}
    </svg>
);

export const DashIcons = {
    Package: (p: IconProps) => (
        <Svg {...p}><path d="M21 8l-9-5-9 5 9 5 9-5z" /><path d="M3 8v8l9 5 9-5V8" /><path d="M12 13v8" /></Svg>
    ),
    Users: (p: IconProps) => (
        <Svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></Svg>
    ),
    File: (p: IconProps) => (
        <Svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></Svg>
    ),
    Grid: (p: IconProps) => (
        <Svg {...p}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></Svg>
    ),
    Tag: (p: IconProps) => (
        <Svg {...p}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></Svg>
    ),
    Settings: (p: IconProps) => (
        <Svg {...p}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Svg>
    ),
    Book: (p: IconProps) => (
        <Svg {...p}><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></Svg>
    ),
    External: (p: IconProps) => (
        <Svg {...p}><path d="M7 17L17 7" /><path d="M8 7h9v9" /></Svg>
    ),
    Download: (p: IconProps) => (
        <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></Svg>
    ),
    Clock: (p: IconProps) => (
        <Svg {...p}><circle cx="12" cy="12" r="9" /><polyline points="12 7 12 12 15 14" /></Svg>
    ),
    Search: (p: IconProps) => (
        <Svg {...p}><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></Svg>
    ),
    Close: (p: IconProps) => (
        <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
    ),
    Edit: (p: IconProps) => (
        <Svg {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></Svg>
    ),
    Trash: (p: IconProps) => (
        <Svg {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /></Svg>
    ),
    Plus: (p: IconProps) => (
        <Svg {...p}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></Svg>
    ),
    ChevronLeft: (p: IconProps) => (
        <Svg {...p}><polyline points="15 18 9 12 15 6" /></Svg>
    ),
    ChevronRight: (p: IconProps) => (
        <Svg {...p}><polyline points="9 18 15 12 9 6" /></Svg>
    ),
    ChevronDown: (p: IconProps) => (
        <Svg {...p}><polyline points="6 9 12 15 18 9" /></Svg>
    ),
    ChevronUp: (p: IconProps) => (
        <Svg {...p}><polyline points="18 15 12 9 6 15" /></Svg>
    ),
    More: (p: IconProps) => (
        <Svg {...p}><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></Svg>
    ),
    Check: (p: IconProps) => (
        <Svg {...p}><polyline points="20 6 9 17 4 12" /></Svg>
    ),
    Minus: (p: IconProps) => (
        <Svg {...p}><line x1="5" y1="12" x2="19" y2="12" /></Svg>
    ),
    X: (p: IconProps) => (
        <Svg {...p}><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></Svg>
    ),
    Undo: (p: IconProps) => (
        <Svg {...p}><polyline points="9 14 4 9 9 4" /><path d="M20 20v-7a4 4 0 0 0-4-4H4" /></Svg>
    ),
    Eye: (p: IconProps) => (
        <Svg {...p}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></Svg>
    ),
    Info: (p: IconProps) => (
        <Svg {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></Svg>
    ),
    Alert: (p: IconProps) => (
        <Svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></Svg>
    ),
    CheckCircle: (p: IconProps) => (
        <Svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Svg>
    ),
    Upload: (p: IconProps) => (
        <Svg {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></Svg>
    ),
    Mail: (p: IconProps) => (
        <Svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22 6 12 13 2 6" /></Svg>
    ),
    Star: (p: IconProps) => (
        <Svg {...p}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></Svg>
    ),
    Truck: (p: IconProps) => (
        <Svg {...p}><rect x="1" y="3" width="15" height="13" /><polygon points="16 8 20 8 23 11 23 16 16 16 16 8" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></Svg>
    ),
    Box: (p: IconProps) => (
        <Svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></Svg>
    ),
    Percent: (p: IconProps) => (
        <Svg {...p}><line x1="19" y1="5" x2="5" y2="19" /><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" /></Svg>
    ),
    Refresh: (p: IconProps) => (
        <Svg {...p}><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></Svg>
    ),
};
