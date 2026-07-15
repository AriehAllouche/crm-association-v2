import { Lock, Zap } from 'lucide-react';

export function ComingSoonPage({ featureName }: { featureName: string }) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-warning-100">
          <Zap size={32} className="text-warning-600" />
        </div>
        <h2 className="mb-2 text-2xl font-semibold text-neutral-900">
          {featureName}
        </h2>
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-2">
          <Lock size={16} className="text-primary-600" />
          <span className="text-sm font-medium text-primary-700">
            Fonctionnalité à venir - PHÉNIX V2
          </span>
        </div>
        <p className="text-sm text-neutral-500">
          Cette fonctionnalité sera disponible dans la prochaine version de PHÉNIX.
        </p>
      </div>
    </div>
  );
}
