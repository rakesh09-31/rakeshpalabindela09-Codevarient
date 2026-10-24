interface BrandMarkProps {
  /** Optional pixel size override. If omitted, uses responsive classes: 112px on desktop, 92px on mobile */
  size?: number;
  /** Optional additional class names */
  className?: string;
}

export function BrandMark({ size, className = '' }: BrandMarkProps) {
  const isCustomSize = typeof size === 'number';
  const customIconSize = isCustomSize ? Math.round(size * 0.62) : undefined;

  return (
    <div
      className={`relative flex items-center justify-center rounded-3xl transition-transform ${
        isCustomSize
          ? ''
          : 'w-[92px] h-[92px] sm:w-[112px] sm:h-[112px]'
      } ${className}`}
      style={{
        ...(isCustomSize ? { width: size, height: size } : {}),
        background: 'linear-gradient(145deg, #203D3A 0%, #152B28 50%, #0F1F1D 100%)',
        border: '1px solid rgba(66, 232, 180, 0.42)',
        boxShadow:
          '0 20px 48px -8px rgba(66, 232, 180, 0.35), 0 0 28px 2px rgba(66, 232, 180, 0.18), inset 0 0 0 1px rgba(66, 232, 180, 0.22)',
      }}
      role="img"
      aria-label="The Project Graveyard brand mark"
    >
      <svg
        width={customIconSize}
        height={customIconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${
          isCustomSize ? '' : 'w-[58px] h-[58px] sm:w-[70px] sm:h-[70px]'
        } drop-shadow-sm select-none`}
      >
        <defs>
          <linearGradient
            id="pg-spark-grad"
            x1="24"
            y1="6"
            x2="24"
            y2="24"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFE082" />
            <stop offset="100%" stopColor="#FFB86B" />
          </linearGradient>
          <filter id="pg-spark-bloom" x="12" y="2" width="24" height="26" filterUnits="userSpaceOnUse">
            <feGaussianBlur stdDeviation="1.5" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Open Archive / Folio Base */}
        {/* Left page */}
        <path
          d="M24 38C19 35.5 13 36 8 38.5V23C13 20.5 19 20 24 22.5V38Z"
          fill="#E2F7F0"
          fillOpacity="0.95"
        />
        {/* Right page */}
        <path
          d="M24 38C29 35.5 35 36 40 38.5V23C35 20.5 29 20 24 22.5V38Z"
          fill="#FFFFFF"
        />
        {/* Center Spine Divider */}
        <path
          d="M24 22.5V38.5"
          stroke="#42E8B4"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Page detail lines */}
        <path
          d="M12 26.5C15.5 25 19 25 21.5 26"
          stroke="#85C7B3"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M26.5 26C29 25 32.5 25 36 26.5"
          stroke="#85C7B3"
          strokeWidth="1.2"
          strokeLinecap="round"
        />

        {/* Luminous Warm Amber Revival Spark with Bloom Filter */}
        <path
          d="M24 6C24 11 20 15 15 15C20 15 24 19 24 24C24 19 28 15 33 15C28 15 24 11 24 6Z"
          fill="url(#pg-spark-grad)"
          filter="url(#pg-spark-bloom)"
        />
        {/* Central Core Light */}
        <circle cx="24" cy="15" r="1.6" fill="#FFFFFF" />

        {/* Secondary micro-sparkles */}
        <circle cx="14" cy="10" r="1.2" fill="#FFB86B" fillOpacity="0.9" />
        <circle cx="34" cy="10" r="1.3" fill="#FFB86B" fillOpacity="0.9" />
      </svg>
    </div>
  );
}

export default BrandMark;
