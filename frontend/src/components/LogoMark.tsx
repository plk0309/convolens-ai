export default function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke="currentColor" strokeWidth="2.5" />
      <rect x="9" y="13" width="2.6" height="6" rx="1.3" fill="currentColor" />
      <rect x="14.7" y="8.5" width="2.6" height="15" rx="1.3" fill="var(--color-cobalt)" />
      <rect x="20.4" y="11" width="2.6" height="10" rx="1.3" fill="currentColor" />
    </svg>
  );
}