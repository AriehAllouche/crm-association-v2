import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { FolderPlus, X } from 'lucide-react';

interface DocumentFolderFormProps {
  animalId: string;
  onFolderSelected: (folder: string) => void;
  selectedFolder?: string;
}

const DEFAULT_FOLDERS = ['Général', 'Santé', 'Juridique', 'Contrats', 'Administratif'];

export function DocumentFolderForm({
  animalId,
  onFolderSelected,
  selectedFolder = 'Général',
}: DocumentFolderFormProps) {
  const [folders, setFolders] = useState<string[]>(DEFAULT_FOLDERS);
  const [selectedValue, setSelectedValue] = useState(selectedFolder);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(false);

  // Charger les dossiers existants pour cet animal
  useEffect(() => {
    loadExistingFolders();
  }, [animalId]);

  const loadExistingFolders = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('folder')
        .eq('animal_id', animalId)
        .not('folder', 'is', null);

      if (error) throw error;

      const existingFolders = [...new Set(data?.map(d => d.folder).filter(Boolean) || [])];
      const allFolders = [...new Set([...DEFAULT_FOLDERS, ...existingFolders])];
      setFolders(allFolders);
    } catch (error) {
      console.error('Erreur lors du chargement des dossiers:', error);
    }
  };

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__new__') {
      setIsCreatingNew(true);
      setNewFolderName('');
    } else {
      setSelectedValue(value);
      onFolderSelected(value);
      setIsCreatingNew(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setLoading(true);
    try {
      // Ajouter le nouveau dossier à la liste
      const updatedFolders = [...new Set([...folders, newFolderName.trim()])];
      setFolders(updatedFolders);
      setSelectedValue(newFolderName.trim());
      onFolderSelected(newFolderName.trim());
      setIsCreatingNew(false);
      setNewFolderName('');
    } catch (error) {
      console.error('Erreur lors de la création du dossier:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelNew = () => {
    setIsCreatingNew(false);
    setNewFolderName('');
    setSelectedValue(selectedFolder);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-neutral-700">
        Dossier / Catégorie
      </label>

      {!isCreatingNew ? (
        <div className="relative">
          <select
            value={selectedValue}
            onChange={handleSelectChange}
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
          >
            {folders.map((folder) => (
              <option key={folder} value={folder}>
                📁 {folder}
              </option>
            ))}
            <option value="__new__">+ Créer un nouveau dossier</option>
          </select>
        </div>
      ) : (
        <div className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              📁
            </span>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nom du nouveau dossier..."
              className="w-full rounded-lg border border-neutral-300 bg-white pl-9 pr-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateFolder();
                }
              }}
            />
          </div>
          <button
            type="button"
            onClick={handleCreateFolder}
            disabled={loading || !newFolderName.trim()}
            className="rounded-lg bg-primary-600 px-3 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:bg-primary-300 transition-colors"
          >
            <FolderPlus size={18} />
          </button>
          <button
            type="button"
            onClick={handleCancelNew}
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      )}

      <p className="text-xs text-neutral-500">
        Organisez vos documents par dossier pour faciliter leur recherche.
      </p>
    </div>
  );
}
