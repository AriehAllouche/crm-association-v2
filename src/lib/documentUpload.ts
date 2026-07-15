import { supabase } from './supabase';

/**
 * Accès aux fichiers du bucket `documents`.
 *
 * Le bucket est privé (voir 20260715120000_documents_storage_bucket.sql): la
 * lecture passe par des URLs signées à durée limitée, jamais par getPublicUrl.
 * C'est pourquoi la base stocke le chemin (`storage_path`) et non une URL,
 * qui expirerait.
 */

export const DOCUMENTS_BUCKET = 'documents';
export const MAX_DOCUMENT_SIZE = 25 * 1024 * 1024; // aligné sur file_size_limit du bucket

const SIGNED_URL_TTL = 3600; // 1 h

// Doit rester aligné sur allowed_mime_types du bucket: un type absent ici mais
// présent là-bas serait refusé côté client, l'inverse échouerait à l'upload.
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/quicktime',
];

export const ACCEPTED_FILE_EXTENSIONS =
  '.pdf,.jpg,.jpeg,.png,.gif,.webp,.heic,.doc,.docx,.xls,.xlsx,.txt,.csv,.mp4,.mov';

export function isValidDocumentFile(file: File): boolean {
  return ALLOWED_MIME_TYPES.includes(file.type);
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '—';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Construit une clé de stockage sûre.
 * Les clés Storage n'acceptent pas les accents ni les espaces: « Général.pdf »
 * doit devenir « general-<horodatage>.pdf ».
 */
function buildStorageKey(originalName: string, prefix?: string): string {
  const lastDot = originalName.lastIndexOf('.');
  // lastDot <= 0 => pas d'extension, ou nom commençant par un point.
  const extension = lastDot > 0 ? originalName.slice(lastDot + 1).toLowerCase() : '';
  const baseName = lastDot > 0 ? originalName.slice(0, lastDot) : originalName;

  const cleanBaseName =
    baseName
      .normalize('NFD')
      .replace(/\p{M}/gu, '') // retire les diacritiques (accents)
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'document';

  const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const fileName = extension
    ? `${cleanBaseName}-${unique}.${extension}`
    : `${cleanBaseName}-${unique}`;

  return prefix ? `${prefix}/${fileName}` : fileName;
}

export interface UploadedDocument {
  storage_path: string;
  nom_fichier: string;
  taille: number;
}

/**
 * Envoie un fichier dans le bucket `documents`.
 * @param pathPrefix Regroupe les fichiers (ex: l'id de l'animal). Sans préfixe
 *                   les fichiers atterrissent dans `divers/`.
 */
export async function uploadDocument(
  file: File,
  pathPrefix?: string
): Promise<UploadedDocument> {
  if (!isValidDocumentFile(file)) {
    throw new Error(
      `Type de fichier non supporté (${file.type || 'inconnu'}). ` +
        'Formats acceptés: PDF, images, Word, Excel, texte, vidéo.'
    );
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    throw new Error(
      `Le fichier dépasse la taille maximale de ${formatFileSize(MAX_DOCUMENT_SIZE)}.`
    );
  }

  const path = buildStorageKey(file.name, pathPrefix || 'divers');

  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false, // la clé est unique: un upsert masquerait une collision
    });

  if (error) throw new Error(traduireErreurStorage(error.message));

  return {
    storage_path: data.path,
    nom_fichier: file.name,
    taille: file.size,
  };
}

/**
 * URL temporaire de lecture d'un fichier stocké.
 */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  if (error) throw new Error(traduireErreurStorage(error.message));
  if (!data?.signedUrl) throw new Error('Impossible de générer le lien de téléchargement.');

  return data.signedUrl;
}

/**
 * Résout l'adresse lisible d'un document, qu'il soit stocké ou externe.
 */
export async function resolveDocumentUrl(doc: {
  storage_path?: string | null;
  url?: string | null;
}): Promise<string> {
  if (doc.storage_path) return getSignedUrl(doc.storage_path);
  if (doc.url) return doc.url;
  throw new Error('Ce document n\'a ni fichier joint ni lien externe.');
}

export async function deleteDocumentFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
  if (error) throw new Error(traduireErreurStorage(error.message));
}

/**
 * Supprime un document: la ligne en base et, le cas échéant, le fichier joint.
 *
 * La ligne part en premier. Dans l'ordre inverse, un échec de la suppression en
 * base laisserait une ligne pointant vers un fichier disparu — un document
 * visible mais impossible à ouvrir. Ici le pire cas est un fichier orphelin
 * dans le bucket, invisible pour l'utilisateur.
 */
export async function deleteDocument(doc: {
  id: string;
  storage_path?: string | null;
}): Promise<void> {
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw new Error(error.message);

  if (doc.storage_path) {
    try {
      await deleteDocumentFile(doc.storage_path);
    } catch (err) {
      // La ligne est déjà partie: signaler l'échec ferait croire à l'utilisateur
      // que la suppression n'a pas eu lieu.
      console.error('Fichier orphelin dans le bucket:', doc.storage_path, err);
    }
  }
}

/**
 * Ouvre un document dans un nouvel onglet.
 * L'onglet est ouvert avant l'await: après une opération asynchrone, window.open
 * n'est plus rattaché au clic et se fait bloquer par le navigateur.
 */
export async function openDocument(doc: {
  storage_path?: string | null;
  url?: string | null;
}): Promise<void> {
  const tab = window.open('', '_blank');
  try {
    const url = await resolveDocumentUrl(doc);
    if (tab) tab.location.href = url;
    else window.location.href = url; // onglet bloqué: repli sur la navigation directe
  } catch (err) {
    tab?.close();
    throw err;
  }
}

function traduireErreurStorage(message: string): string {
  if (/Bucket not found/i.test(message)) {
    return 'Le bucket « documents » n\'existe pas. Appliquez la migration 20260715120000_documents_storage_bucket.sql.';
  }
  if (/exceeded the maximum allowed size/i.test(message)) {
    return `Le fichier dépasse la taille maximale de ${formatFileSize(MAX_DOCUMENT_SIZE)}.`;
  }
  if (/mime type .* is not supported/i.test(message)) {
    return 'Type de fichier refusé par le serveur.';
  }
  if (/row-level security|Unauthorized|403/i.test(message)) {
    return 'Accès refusé au stockage. Vérifiez que vous êtes connecté et que les policies du bucket sont en place.';
  }
  if (/already exists/i.test(message)) {
    return 'Un fichier portant ce nom existe déjà. Réessayez.';
  }
  return message;
}
