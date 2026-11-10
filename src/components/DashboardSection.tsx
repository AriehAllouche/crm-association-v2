import { useState, type ReactNode } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';

type Tone = 'error' | 'warning' | 'success' | 'primary' | 'neutral';

const toneClasses: Record<Tone, string> = {
  error: 'bg-error-50 text-error-600',
  warning: 'bg-warning-50 text-warning-600',
  success: 'bg-success-50 text-success-600',
  primary: 'bg-primary-50 text-primary-600',
  neutral: 'bg-neutral-100 text-neutral-600',
};

interface DashboardSectionProps {
  title: string;
  icon: LucideIcon;
  tone?: Tone;
  children: ReactNode;
}

export function DashboardSection({ title, icon: Icon, tone = 'primary', children }: DashboardSectionProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-neutral-50"
      >
        <span className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
            <Icon size={18} />
          </span>
          <span className="font-heading text-base font-semibold text-neutral-900">{title}</span>
        </span>
        <ChevronDown
          size={18}
          className={`text-neutral-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="grid grid-cols-2 gap-3 border-t border-neutral-100 p-5 animate-fade-in">
          {children}
        </div>
      )}
    </section>
  );
}

export function DashboardMetric({ label, value, alert = false }: { label: string; value: string | number; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-neutral-50 px-3 py-2.5">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`font-heading text-lg font-bold ${alert ? 'text-error-600' : 'text-neutral-900'}`}>{value}</p>
    </div>
  );
}
