import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

/** Stroke icons drawn in `currentColor`. Decorative by default (`aria-hidden`). */
function createIcon(name: string, paths: React.ReactNode, strokeWidth = 2) {
  function Icon({ size = 18, ...props }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = name;
  return Icon;
}

export const SparkIcon = createIcon(
  "SparkIcon",
  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />,
);
export const ArrowRightIcon = createIcon("ArrowRightIcon", <path d="M5 12h14M13 6l6 6-6 6" />);
export const SearchIcon = createIcon(
  "SearchIcon",
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </>,
);
export const SearchOffIcon = createIcon(
  "SearchOffIcon",
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5M8.5 11h5" />
  </>,
  1.8,
);
export const CloseIcon = createIcon("CloseIcon", <path d="M6 6l12 12M18 6L6 18" />);
export const CheckIcon = createIcon("CheckIcon", <path d="M5 12.5l4.5 4.5L19 7.5" />, 2.4);
export const InfoCircleIcon = createIcon(
  "InfoCircleIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16.5h.01" />
  </>,
  2.2,
);
export const QuestionCircleIcon = createIcon(
  "QuestionCircleIcon",
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .8-1 1.5V14M12 17.5h.01" />
  </>,
);
export const WarningIcon = createIcon(
  "WarningIcon",
  <>
    <path d="M10.3 3.9L2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    <path d="M12 9v4M12 17h.01" />
  </>,
);
