interface LoadingOverlayProps {
  message?: string;
}

const BAR_HEIGHTS = [0.45, 0.75, 1, 0.6, 1, 0.75, 0.45];

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  return (
    <div className="fixed inset-0 bg-white/60 dark:bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in">
      <div className="flex flex-col items-center gap-6 bg-white dark:bg-zinc-900 px-12 py-10 rounded-2xl shadow-2xl border border-zinc-100 dark:border-zinc-800">

        {/* Animated waveform logo */}
        <div className="flex items-center gap-[5px]" style={{ height: 52 }}>
          {BAR_HEIGHTS.map((h, i) => (
            <div
              key={i}
              className="w-[6px] rounded-full bg-[#863bff]"
              style={{
                height: `${h * 52}px`,
                transformOrigin: 'center',
                animation: 'waveBar 1.1s ease-in-out infinite',
                animationDelay: `${i * 0.1}s`,
              }}
            />
          ))}
        </div>

        {message && (
          <p className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 tracking-wide">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
