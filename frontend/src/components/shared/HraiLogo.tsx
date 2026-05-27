export function HraiLogo({ height = 32 }: { height?: number }) {
  return (
    <img
      src="/logo.png"
      alt="HRAIPP"
      style={{ maxHeight: `${height}px`, height: 'auto', width: 'auto', maxWidth: '100%' }}
      draggable={false}
      className="select-none shrink-0"
    />
  );
}
