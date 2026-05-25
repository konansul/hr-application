// Three vertical pills with dots above — the HRAIPP brand mark
// Left = cyan, middle = blue, right = violet (matches the reference image gradient)

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
      {/* Left — cyan */}
      <circle cx="5"  cy="35" r="5" fill="#06b6d4" />
      <rect   x="0"  y="44" width="10" height="24" rx="5" fill="#06b6d4" />

      {/* Middle — blue */}
      <circle cx="25" cy="19" r="5" fill="#3b82f6" />
      <rect   x="20" y="28" width="10" height="40" rx="5" fill="#3b82f6" />

      {/* Right — violet */}
      <circle cx="45" cy="3"  r="5" fill="#8b5cf6" />
      <rect   x="40" y="12" width="10" height="56" rx="5" fill="#8b5cf6" />
    </svg>
  );
}
