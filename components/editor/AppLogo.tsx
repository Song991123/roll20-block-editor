interface AppLogoProps {
  className?: string;
}

export function AppLogo({ className }: AppLogoProps) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      className={className}
      aria-hidden="true"
      data-testid="app-logo"
      data-logo-kind="sheet-blocks"
    >
      <rect x="1.5" y="1.5" width="33" height="33" rx="8" fill="#FFE8F0" />
      <rect x="1.5" y="1.5" width="33" height="33" rx="8" stroke="#EDB0C3" />
      <path
        d="M9.5 6.75H20.5L27 13.25V29.25H9.5V6.75Z"
        fill="#FFFDFE"
        stroke="#70364A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M20.5 6.75V13.25H27"
        fill="#F9CAD8"
        stroke="#70364A"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <rect x="12.5" y="16.25" width="4.75" height="4.75" rx="1.25" fill="#DD5C84" />
      <path d="M19 18.625H23.5" stroke="#70364A" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="12.5" y="22.75" width="4.75" height="4.75" rx="1.25" fill="#63B7AD" />
      <path d="M19 25.125H23.5" stroke="#70364A" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
