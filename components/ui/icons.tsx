import type { SVGProps } from "react";

/** Drawn icon set: 24px grid, 1.75 stroke, round caps. Decorative by default. */
function Icon({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={20}
      height={20}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

export const GalleryIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" />
    <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" />
    <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" />
  </Icon>
);

export const ImageIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2.5" />
    <circle cx="9" cy="10" r="1.75" />
    <path d="m3.5 17 5-4.5 4 3.5 3-2.5 5 4" />
  </Icon>
);

export const VideoIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="5" width="13.5" height="14" rx="2.5" />
    <path d="m16.5 10.5 4.5-2.5v8l-4.5-2.5" />
  </Icon>
);

export const UploadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 16V4" />
    <path d="m7 9 5-5 5 5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </Icon>
);

export const LockIcon = (p: P) => (
  <Icon {...p}>
    <rect x="5" y="11" width="14" height="9.5" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </Icon>
);

export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

export const ChevronDownIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 9 6 6 6-6" />
  </Icon>
);

export const ChevronUpIcon = (p: P) => (
  <Icon {...p}>
    <path d="m6 15 6-6 6 6" />
  </Icon>
);

export const ArrowLeftIcon = (p: P) => (
  <Icon {...p}>
    <path d="M19 12H5" />
    <path d="m11 6-6 6 6 6" />
  </Icon>
);

export const UndoIcon = (p: P) => (
  <Icon {...p}>
    <path d="M9 7 4 12l5 5" />
    <path d="M4 12h11a5 5 0 0 1 0 10h-2" />
  </Icon>
);

export const RedoIcon = (p: P) => (
  <Icon {...p}>
    <path d="m15 7 5 5-5 5" />
    <path d="M20 12H9a5 5 0 0 0 0 10h2" />
  </Icon>
);

export const CompareIcon = (p: P) => (
  <Icon {...p}>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M12 2v20" />
  </Icon>
);

export const ArrowRightIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12h14" />
    <path d="m13 6 6 6-6 6" />
  </Icon>
);

export const SparkIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    <path d="m6.5 6.5 2 2M15.5 15.5l2 2M17.5 6.5l-2 2M8.5 15.5l-2 2" />
  </Icon>
);

export const AlertIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3.5 2.5 20h19L12 3.5Z" />
    <path d="M12 10v4.5" />
    <path d="M12 17.5v.01" />
  </Icon>
);

export const InfoIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5" />
    <path d="M12 7.5v.01" />
  </Icon>
);

export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 5.5v13l11-6.5-11-6.5Z" />
  </Icon>
);

export const DownloadIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 4v12" />
    <path d="m7 11 5 5 5-5" />
    <path d="M4 15v3.5A1.5 1.5 0 0 0 5.5 20h13a1.5 1.5 0 0 0 1.5-1.5V15" />
  </Icon>
);

export const TrashIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M10 7V4.5h4V7" />
    <path d="m6 7 1 12.5h10L18 7" />
    <path d="M10 11v5M14 11v5" />
  </Icon>
);

export const MenuIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 7h16M4 12h16M4 17h16" />
  </Icon>
);
