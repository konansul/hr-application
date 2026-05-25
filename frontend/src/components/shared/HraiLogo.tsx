// Three vertical pills matching the official HRAIPP brand mark:
//   Left  — solid cyan  #00C8E8
//   Middle — cyan→blue vertical gradient bar, flat blue dot
//   Right  — blue→purple vertical gradient bar, vivid purple dot

export function HraiLogo({ height = 32 }: { height?: number }) {
  const width = Math.round(height * 50 / 68);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 50 68"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Middle bar: cyan-blue at bottom → blue at top */}
        <linearGradient id="hrai-mid" x1="0" y1="68" x2="0" y2="28" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#16C0EE" />
          <stop offset="100%" stopColor="#4B6CF5" />
        </linearGradient>
        {/* Right bar: blue at bottom → purple at top */}
        <linearGradient id="hrai-right" x1="0" y1="68" x2="0" y2="12" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#4060F8" />
          <stop offset="100%" stopColor="#7020EF" />
        </linearGradient>
      </defs>

      {/* Left — solid cyan */}
      <circle cx="5"  cy="35" r="5"  fill="#00C8E8" />
      <rect   x="0"  y="44"  width="10" height="24" rx="5" fill="#00C8E8" />

      {/* Middle — flat blue dot, cyan→blue gradient bar */}
      <circle cx="25" cy="19" r="5"  fill="#4B6CF5" />
      <rect   x="20" y="28"  width="10" height="40" rx="5" fill="url(#hrai-mid)" />

      {/* Right — vivid purple dot, blue→purple gradient bar */}
      <circle cx="45" cy="3"  r="5"  fill="#8020EF" />
      <rect   x="40" y="12"  width="10" height="56" rx="5" fill="url(#hrai-right)" />
    </svg>
  );
}
