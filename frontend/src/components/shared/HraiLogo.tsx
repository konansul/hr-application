export function HraiLogo({ height = 32 }: { height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="HRAIPP"
      style={{ height: `${height}px`, width: 'auto' }}
      draggable={false}
      className="select-none shrink-0"
    />
  );
}
