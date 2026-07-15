import { useRef, useState } from 'react';
import { Upload, X, Loader2, FileText, Link as LinkIcon } from 'lucide-react';
import {
  uploadDocument,
  deleteDocumentFile,
  formatFileSize,
  ACCEPTED_FILE_EXTENSIONS,
  MAX_DOCUMENT_SIZE,
  type UploadedDocument,
} from '../lib/documentUpload';

export interface DocumentSource {
  storage_path: string | null;
  url: string | null;
  nom_fichier: string;
  taille: number | null;
}

interface DocumentUploadProps {
  value: DocumentSource;
  onChange: (value: DocumentSource) => void;
  /** Regroupe les fichiers dans le bucket (ex: id de l'animal). */
  pathPrefix?: string;
  disabled?: boolean;
  /** Autorise le repli sur un lien externe (Google Drive, etc.). */
  allowExternalUrl?: boolean;
}

const EMPTY: DocumentSource = { storage_path: null, url: null, nom_fichier: '', taille: null };

export function emptyDocumentSource(): DocumentSource {
  return { ...EMPTY };
}

export function DocumentUpload({
  value,
  onChange,
  pathPrefix,
  disabled = false,
  allowExternalUrl = true,
}: DocumentUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mode, setMode] = useState<'file' | 'url'>('file');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const uploaded: UploadedDocument = await uploadDocument(file, pathPrefix);
      onChange({
        storage_path: uploaded.storage_path,
        url: null,
        nom_fichier: uploaded.nom_fichier,
        taille: uploaded.taille,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'envoi du fichier');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled || uploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleRemove = async () => {
    // Le fichier est déjà dans le bucket: sans suppression il y resterait
    // orphelin, la ligne `documents` n'ayant jamais été créée.
    if (value.storage_path) {
      try {
        await deleteDocumentFile(value.storage_path);
      } catch {
        // Le nettoyage est secondaire: on libère le formulaire quoi qu'il arrive.
      }
    }
    onChange(emptyDocumentSource());
    setError(null);
  };

  const switchMode = (next: 'file' | 'url') => {
    setMode(next);
    setError(null);
    onChange(emptyDocumentSource());
  };

  // --- Fichier déjà joint -------------------------------------------------
  if (value.storage_path) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3 rounded-lg border border-success-200 bg-success-50 px-4 py-3">
          <FileText size={20} className="flex-shrink-0 text-success-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-900">{value.nom_fichier}</p>
            <p className="text-xs text-neutral-500">{formatFileSize(value.taille)} • envoyé</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="flex-shrink-0 rounded-lg p-1.5 text-neutral-400 transition-colors hover:bg-error-50 hover:text-error-600"
              title="Retirer le fichier"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // --- Saisie d'un lien externe -------------------------------------------
  if (mode === 'url') {
    return (
      <div className="space-y-2">
        <input
          type="url"
          value={value.url ?? ''}
          onChange={(e) =>
            onChange({ storage_path: null, url: e.target.value, nom_fichier: value.nom_fichier, taille: null })
          }
          placeholder="https://drive.google.com/..."
          className="input"
          disabled={disabled}
        />
        {allowExternalUrl && (
          <button
            type="button"
            onClick={() => switchMode('file')}
            className="text-xs font-medium text-primary-600 hover:text-primary-700"
          >
            ← Envoyer un fichier à la place
          </button>
        )}
      </div>
    );
  }

  // --- Zone de dépôt -------------------------------------------------------
  return (
    <div className="space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_EXTENSIONS}
        onChange={handleInputChange}
        className="hidden"
        disabled={disabled || uploading}
      />

      <button
        type="button"
        onClick={() => !disabled && !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled && !uploading) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        disabled={disabled || uploading}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 transition-colors disabled:opacity-60 ${
          dragging
            ? 'border-primary-400 bg-primary-50'
            : 'border-neutral-300 bg-neutral-50 hover:border-primary-400 hover:bg-primary-50'
        }`}
      >
        {uploading ? (
          <>
            <Loader2 size={24} className="animate-spin text-primary-500" />
            <span className="text-sm text-neutral-600">Envoi en cours...</span>
          </>
        ) : (
          <>
            <Upload size={24} className="text-neutral-400" />
            <span className="text-sm font-medium text-neutral-700">
              Glissez un fichier ici ou cliquez pour parcourir
            </span>
            <span className="text-xs text-neutral-400">
              PDF, images, Word, Excel — max {formatFileSize(MAX_DOCUMENT_SIZE)}
            </span>
          </>
        )}
      </button>

      {error && <p className="text-xs text-error-600">{error}</p>}

      {allowExternalUrl && !uploading && (
        <button
          type="button"
          onClick={() => switchMode('url')}
          className="inline-flex items-center gap-1 text-xs font-medium text-primary-600 hover:text-primary-700"
        >
          <LinkIcon size={12} />
          Utiliser un lien externe (Google Drive...)
        </button>
      )}
    </div>
  );
}
