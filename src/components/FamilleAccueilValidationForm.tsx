import { useState } from 'react';
import { supabase } from '../lib/supabase';

type FamilleAccueilStatus = 'En attente' | 'Validée' | 'Refusée';

interface FamilleAccueilValidationFormProps {
  familleId: string;
  currentStatus: string;
  currentRejectionReason?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function FamilleAccueilValidationForm({
  familleId,
  currentStatus,
  currentRejectionReason,
  onSuccess,
  onCancel,
}: FamilleAccueilValidationFormProps) {
  const [status, setStatus] = useState<FamilleAccueilStatus>(currentStatus as FamilleAccueilStatus);
  const [rejectionReason, setRejectionReason] = useState(currentRejectionReason || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation: si refusé, le motif est obligatoire
    if (status === 'Refusée' && !rejectionReason.trim()) {
      setError('Le motif du refus est obligatoire');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase
        .from('famille_accueils')
        .update({
          status,
          rejection_reason: status === 'Refusée' ? rejectionReason : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', familleId);

      if (updateError) throw updateError;

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Statut de la famille d'accueil
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as FamilleAccueilStatus)}
          className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        >
          <option value="En attente">En attente</option>
          <option value="Validée">Validée</option>
          <option value="Refusée">Refusée</option>
        </select>
      </div>

      {/* Champ conditionnel: motif du refus */}
      {status === 'Refusée' && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <label className="block text-sm font-medium text-neutral-700 mb-1">
            Motif du refus <span className="text-error-500">*</span>
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Expliquez les raisons du refus..."
            rows={4}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-error-500 focus:outline-none focus:ring-2 focus:ring-error-100"
            required
          />
          <p className="mt-1 text-xs text-neutral-500">
            Ce motif sera visible dans l'historique de la famille d'accueil.
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-error-50 border border-error-200 px-3 py-2 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-primary-300 transition-colors"
        >
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </form>
  );
}
