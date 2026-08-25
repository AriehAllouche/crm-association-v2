import { Flame } from 'lucide-react';

export function Logo({ size = 40, className = '' }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 shadow-lg shadow-primary-500/30"
        style={{ width: size, height: size }}
      >
        <Flame size={size * 0.55} className="text-white" strokeWidth={2.5} />
      </div>
      <div className="flex flex-col leading-none">
        <span className="font-heading text-xl font-bold tracking-tight text-neutral-900">
          PHÉNIX
        </span>
        <span className="text-[10px] font-medium uppercase tracking-widest text-primary-600">
          Protection Animale
        </span>
      </div>
    </div>
  );
}
