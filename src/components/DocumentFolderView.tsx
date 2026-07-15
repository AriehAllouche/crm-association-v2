import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronDown, ChevronRight, FileText, Calendar, Download } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Document {
  id: string;
  titre: string;
  description?: string;
  fichier_url?: string;
  type?: string;
  date_document?: string;
  folder: string;
  created_at: string;
}

interface DocumentFolderViewProps {
  animalId: string;
}

export function DocumentFolderView({ animalId }: DocumentFolderViewProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

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
                            {doc.titre}
                          </p>
                          {doc.type && (
                            <span className="text-xs text-neutral-500 capitalize">
                              • {doc.type}
                            </span>
                          )}
                        </div>
                        {doc.description && (
                          <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                            {doc.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-neutral-400">
                          {doc.date_document && (
                            <div className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span>
                                {format(new Date(doc.date_document), 'dd MMM yyyy', { locale: fr })}
                              </span>
                            </div>
                          )}
                          <span>
                                Ajouté le {format(new Date(doc.created_at), 'dd MMM yyyy', { locale: fr })}
                              </span>
                        </div>
                      </div>
                      {doc.fichier_url && (
                        <a
                          href={doc.fichier_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-shrink-0 p-2 text-neutral-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Télécharger"
                        >
                          <Download size={18} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
