/**
 * Service d'intégration Google Drive pour PHÉNIX via Service Account
 * Permet de stocker et lire les documents sur Google Drive
 * sans surcharger la base de données Supabase
 * 
 * AVANTAGE: Pas d'écran de consentement OAuth, tous les fichiers
 * sont stockés dans un Drive centralisé géré par un Service Account
 */

export interface GoogleDriveFile {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink: string;
  mimeType: string;
  size?: string;
  createdTime: string;
}

export interface GoogleDriveConfig {
  apiUrl: string; // URL de votre API backend qui gère le Service Account
}

/**
 * Configuration Google Drive API
 * L'API backend doit être créée pour gérer le Service Account
 */
export const GOOGLE_DRIVE_CONFIG: GoogleDriveConfig = {
  apiUrl: import.meta.env.VITE_GOOGLE_DRIVE_API_URL || '/api/google-drive',
};

/**
 * Lit le corps d'une réponse HTTP en échec et en extrait le vrai message
 * d'erreur renvoyé par le backend (ex: { error: "..." }), au lieu de se
 * contenter d'un message générique. Retombe sur le texte brut si ce
 * n'est pas du JSON, et sur un message par défaut en dernier recours.
 */
async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return json.error || json.message || text || fallback;
    } catch {
      return text || fallback;
    }
  } catch {
    return fallback;
  }
}

/**
 * Service Google Drive via Service Account (Backend)
 * 
 * IMPORTANT: Cette approche nécessite un backend (Node.js/Supabase Edge Functions)
 * pour gérer les credentials du Service Account de manière sécurisée.
 * Les credentials ne doivent JAMAIS être exposés dans le frontend.
 */
export class GoogleDriveService {
  /**
   * Upload un fichier sur Google Drive via le backend
   * @param file - Le fichier à uploader
   * @param folderId - ID du dossier Google Drive (optionnel)
   * @param animalId - ID de l'animal pour organiser les fichiers
   * @returns Informations du fichier uploadé
   */
  async uploadFile(
    file: File,
    folderId?: string,
    animalId?: string
  ): Promise<GoogleDriveFile> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folderId) formData.append('folderId', folderId);
      if (animalId) formData.append('animalId', animalId);

      const response = await fetch(`${GOOGLE_DRIVE_CONFIG.apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Erreur lors de l\'upload du fichier');
        console.error(`Erreur upload Google Drive (${response.status}):`, message);
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur upload Google Drive:', error);
      throw error;
    }
  }

  /**
   * Lister les fichiers d'un dossier via le backend
   * @param folderId - ID du dossier Google Drive
   * @returns Liste des fichiers
   */
  async listFiles(folderId?: string): Promise<GoogleDriveFile[]> {
    try {
      const url = folderId 
        ? `${GOOGLE_DRIVE_CONFIG.apiUrl}/list?folderId=${folderId}`
        : `${GOOGLE_DRIVE_CONFIG.apiUrl}/list`;

      const response = await fetch(url);
      
      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Erreur lors de la liste des fichiers');
        console.error(`Erreur liste fichiers Google Drive (${response.status}):`, message);
        throw new Error(message);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur liste fichiers Google Drive:', error);
      throw error;
    }
  }

  /**
   * Supprimer un fichier via le backend
   * @param fileId - ID du fichier Google Drive
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_CONFIG.apiUrl}/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Erreur lors de la suppression du fichier');
        console.error(`Erreur suppression fichier Google Drive (${response.status}):`, message);
        throw new Error(message);
      }
    } catch (error) {
      console.error('Erreur suppression fichier Google Drive:', error);
      throw error;
    }
  }

  /**
   * Créer un dossier pour un animal via le backend
   * @param animalId - ID de l'animal
   * @param animalName - Nom de l'animal
   * @returns ID du dossier créé
   */
  async createAnimalFolder(animalId: string, animalName: string): Promise<string> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_CONFIG.apiUrl}/create-folder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ animalId, animalName }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Erreur lors de la création du dossier');
        console.error(`Erreur création dossier Google Drive (${response.status}):`, message);
        throw new Error(message);
      }

      const data = await response.json();
      return data.folderId;
    } catch (error) {
      console.error('Erreur création dossier Google Drive:', error);
      throw error;
    }
  }

  /**
   * Obtenir un lien de partage public pour un fichier
   * @param fileId - ID du fichier Google Drive
   * @returns Lien public
   */
  async getShareableLink(fileId: string): Promise<string> {
    try {
      const response = await fetch(`${GOOGLE_DRIVE_CONFIG.apiUrl}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId }),
      });

      if (!response.ok) {
        const message = await extractErrorMessage(response, 'Erreur lors de la création du lien de partage');
        console.error(`Erreur création lien partage (${response.status}):`, message);
        throw new Error(message);
      }

      const data = await response.json();
      return data.webViewLink;
    } catch (error) {
      console.error('Erreur création lien partage:', error);
      throw error;
    }
  }
}

// Export singleton
export const googleDriveService = new GoogleDriveService();