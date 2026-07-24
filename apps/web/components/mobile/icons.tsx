import type { ReactElement, SVGProps } from 'react';

/**
 * Tiny stroke icons for the bottom navigation. Decorative (`aria-hidden`): the
 * nav label supplies the accessible name, so the icon adds no separate a11y noise.
 */
type IconProps = SVGProps<SVGSVGElement>;

function base(props: IconProps): IconProps {
  return {
    width: 24,
    height: 24,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  };
}

export function HomeIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function RoomsIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16 5.5a3 3 0 0 1 0 5.8" />
      <path d="M17 14.5a6 6 0 0 1 4 5.5" />
    </svg>
  );
}

export function LearnIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v15H5.5A1.5 1.5 0 0 0 4 20.5Z" />
      <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v15h5.5a1.5 1.5 0 0 1 1.5 1.5Z" />
    </svg>
  );
}

export function SettingsIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />
    </svg>
  );
}

export function UserIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20a8 8 0 0 1 16 0" />
    </svg>
  );
}

export function CardsIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="10" height="14" rx="2" transform="rotate(-8 8 13)" />
      <rect x="11" y="4" width="10" height="14" rx="2" transform="rotate(8 16 11)" />
    </svg>
  );
}

export function KeyIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <circle cx="8" cy="8" r="4" />
      <path d="M11 11l8 8M16 16l2-2M18 18l2-2" />
    </svg>
  );
}

export function PlayIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M7 4.5v15l12-7.5z" />
    </svg>
  );
}

export function CheckIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M5 12.5 10 17.5 19 6.5" />
    </svg>
  );
}

export function GlobeIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9S9.5 5.5 12 3Z" />
    </svg>
  );
}

export function PaletteIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M12 3a9 9 0 0 0 0 18c1.4 0 2-1 2-2 0-1.4-1-1.6-1-2.6 0-.8.7-1.4 1.6-1.4H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
      <circle cx="7.5" cy="11.5" r="1" />
      <circle cx="10.5" cy="7.5" r="1" />
      <circle cx="15" cy="8" r="1" />
    </svg>
  );
}

export function MotionIcon(props: IconProps): ReactElement {
  return (
    <svg {...base(props)}>
      <path d="M3 12h4l2-6 4 14 2-8h6" />
    </svg>
  );
}
