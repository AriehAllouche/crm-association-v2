import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronRight, FileText, Calendar, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { openDocument, formatFileSize, deleteDocument } from '../lib/documentUpload';

interface Document {
  id: string;
  nom_fichier: string;
  description?: string;
  url?: string | null;
  storage_path?: string | null;
  taille?: number | null;
  type_document?: string;
  folder?: string;
  created_at: string;
}

interface DocumentFolderViewProps {
  animalId: string;
}

export function DocumentFolderView({ animalId }: DocumentFolderViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<Document | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleOpen = async (doc: Document) => {
    setError(null);
    try {
      await openDocument(doc);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d\'ouvrir le document');
    }
  };

  const handleDelete = async () => {
    if (!docToDelete) return;
    setDeleting(true);
    setError(null);
    try {
      await deleteDocument(docToDelete);
      setDocToDelete(null);
      loadDocuments();
    } catch (err) {
      setDocToDelete(null);
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  };

  // Charger les documents
  const loadDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('animal_id', animalId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des documents:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger les documents au montage
  useEffect(() => {
    loadDocuments();
  }, [animalId]);

  // Grouper les documents par dossier
  const groupedDocuments = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const folder = doc.folder || 'Général';
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(doc);
    return acc;
  }, {});

  // Toggle l'état d'un dossier
  const toggleFolder = (folder: string) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(folder)) {
        newSet.delete(folder);
      } else {
        newSet.add(folder);
      }
      return newSet;
    });
  };

  // Déplier tous les dossiers
  const expandAll = () => {
    setExpandedFolders(new Set(Object.keys(groupedDocuments)));
  };

  // Replier tous les dossiers
  const collapseAll = () => {
    setExpandedFolders(new Set());
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-neutral-500">Chargement des documents...</div>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <FileText size={48} className="mx-auto text-neutral-300 mb-3" />
        <p className="text-sm text-neutral-500">Aucun document pour cet animal</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-lg bg-error-50 px-4 py-3 text-sm text-error-700">{error}</div>
      )}

      {/* Actions globales */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-700">
          {documents.length} document{documents.length > 1 ? 's' : ''}
        </h3>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Tout déplier
          </button>
          <span className="text-neutral-300">|</span>
          <button
            onClick={collapseAll}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            Tout replier
          </button>
        </div>
      </div>

      {/* Liste des dossiers */}
      <div className="space-y-2">
        {Object.entries(groupedDocuments).map(([folder, folderDocs]) => {
          const isExpanded = expandedFolders.has(folder);
          
          return (
            <div key={folder} className="border border-neutral-200 rounded-lg overflow-hidden">
              {/* En-tête du dossier */}
              <button
                onClick={() => toggleFolder(folder)}
                className="w-full flex items-center justify-between px-4 py-3 bg-neutral-50 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-neutral-500" />
                  ) : (
                    <ChevronRight size={18} className="text-neutral-500" />
                  )}
                  <span className="font-medium text-neutral-900">📁 {folder}</span>
                  <span className="text-xs text-neutral-500 bg-neutral-200 px-2 py-0.5 rounded-full">
                    {folderDocs.length}
                  </span>
                </div>
              </button>

              {/* Contenu du dossier (accordéon) */}
              {isExpanded && (
                <div className="divide-y divide-neutral-100 animate-in slide-in-from-top-2 duration-200">
                  {folderDocs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        <FileText size={18} className="text-neutral-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-neutral-900 truncate">
                            {doc.nom_fichier}
                          </p>
                          {doc.type_document && (
                            <span className="text-xs text-neutral-500 capitalize">
                              • {doc.type_document}
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                          <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <span>
                              Ajouté le {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                            </span>
                          </div>
                          {doc.taille ? <span>{formatFileSize(doc.taille)}</span> : null}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        {(doc.storage_path || doc.url) && (
                          <button
                            type="button"
                            onClick={() => handleOpen(doc)}
                            className="p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Ouvrir le document"
                          >
                            <Download size={18} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => { setError(null); setDocToDelete(doc); }}
                          className="p-2 text-neutral-400 hover:text-error-600 hover:bg-error-50 rounded-lg transition-colors"
                          title="Supprimer le document"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Confirmation de suppression */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card mx-4 max-w-md p-6">
            <h3 className="font-heading text-lg font-semibold text-neutral-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-neutral-600">
              Voulez-vous vraiment supprimer <strong>{docToDelete.nom_fichier}</strong> ?
              {docToDelete.storage_path
                ? ' Le fichier sera définitivement effacé du stockage.'
                : ' Le lien externe sera retiré du CRM (le fichier d\'origine n\'est pas touché).'}
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setDocToDelete(null)} className="btn-secondary" disabled={deleting}>
                Annuler
              </button>
              <button onClick={handleDelete} className="btn-primary bg-error-600 hover:bg-error-700" disabled={deleting}>
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
