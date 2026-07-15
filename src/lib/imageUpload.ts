import { supabase } from './supabase';

/**
 * Upload une image vers Supabase Storage
 * @param file Le fichier à uploader
 * @param bucket Le nom du bucket (ex: 'animals', 'documents')
 * @param path Le chemin dans le bucket (ex: 'animal-id/photo.jpg')
 * @returns L'URL publique de l'image uploadée
 */
export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<string> {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) throw error;

    // Récupérer l'URL publique
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    return publicUrl;
  } catch (error) {
    console.error('Erreur lors de l\'upload de l\'image:', error);
    throw error;
  }
}

/**
 * Supprime une image de Supabase Storage
 * @param url L'URL de l'image à supprimer
 * @param bucket Le nom du bucket
 */
export async function deleteImage(url: string, bucket: string): Promise<void> {
  try {
    // Extraire le chemin de l'URL
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const path = pathParts.slice(pathParts.indexOf(bucket) + 1).join('/');

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'image:', error);
    throw error;
  }
}

/**
 * Génère un nom de fichier unique pour éviter les collisions
 * @param originalName Le nom original du fichier
 * @param prefix Un préfixe optionnel (ex: ID de l'animal)
 */
export function generateUniqueFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const baseName = originalName.replace(`.${extension}`, '');
  const cleanBaseName = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
  
  const prefixPart = prefix ? `${prefix}-` : '';
  return `${prefixPart}${cleanBaseName}-${timestamp}-${random}.${extension}`;
}

/**
 * Valide qu'un fichier est une image
 * @param file Le fichier à valider
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Valide et redimensionne une image si nécessaire (optionnel)
 * Pour l'instant, on retourne simplement le fichier tel quel
 * Cette fonction peut être étendue pour redimensionner les images trop grandes
 */
export async function processImage(file: File): Promise<File> {
  // Pour l'instant, on retourne le fichier tel quel
  // TODO: Ajouter du redimensionnement si nécessaire
  return file;
}
