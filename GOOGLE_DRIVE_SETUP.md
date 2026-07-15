# Configuration Google Drive pour PHÉNIX (Service Account)

## Avantages du Service Account

- **Pas d'écran de consentement** OAuth pour les utilisateurs
- **Drive centralisé** : tous les fichiers stockés dans un seul compte
- **Sécurité** : credentials gérés côté backend (jamais exposés)
- **Simplicité** : une seule configuration pour toute l'application
- **Gratuit** : Utilise Supabase Edge Functions (gratuit)

## Étape 1: Créer un projet Google Cloud Console

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API Google Drive:
   - Menu "APIs & Services" > "Library"
   - Recherchez "Google Drive API"
   - Cliquez sur "Enable"

## Étape 2: Créer un Service Account

1. Menu "APIs & Services" > "Credentials"
2. Cliquez sur "Create Credentials" > "Service Account"
3. Remplissez les informations:
   - Nom: PHÉNIX CRM Service Account
   - Description: Service Account pour stockage documents PHÉNIX
   - ID: phenix-crm-service-account
4. Cliquez sur "Create and Continue"
5. Rôle: "Editor" ou "Owner" (pour accès complet)
6. Cliquez sur "Done"

## Étape 3: Télécharger la clé JSON

1. Cliquez sur le Service Account créé
2. Onglet "Keys"
3. Cliquez sur "Add Key" > "Create new key"
4. Choisissez "JSON"
5. **IMPORTANT**: Téléchargez et sauvegardez ce fichier JSON
6. Ce fichier contient vos credentials secrets

## Étape 4: Partager le Drive avec le Service Account

1. Ouvrez votre Google Drive où vous voulez stocker les fichiers
2. Créez un dossier "PHÉNIX" (optionnel)
3. Cliquez droit sur le dossier > "Share"
4. Ajoutez l'email du Service Account (format: `phenix-crm-service-account@project-id.iam.gserviceaccount.com`)
5. Donnez le rôle "Editor"

## Étape 5: Déployer l'Edge Function Supabase

L'Edge Function est déjà créée dans `supabase/functions/google-drive/index.ts`.

### 5.1 Installer Supabase CLI

```bash
npm install -g supabase
```

### 5.2 Connecter à votre projet Supabase

```bash
supabase login
supabase link --project-ref votre-projet-id
```

### 5.3 Configurer les secrets Supabase

```bash
supabase secrets set SERVICE_ACCOUNT_EMAIL="votre-email@project.iam.gserviceaccount.com"
supabase secrets set SERVICE_ACCOUNT_KEY="$(cat votre-cle-service-account.json)"
supabase secrets set DRIVE_FOLDER_ID="votre-dossier-id-drive"
```

**Note**: Pour obtenir le DRIVE_FOLDER_ID:
1. Ouvrez le dossier PHÉNIX dans Google Drive
2. L'ID est dans l'URL: `https://drive.google.com/drive/folders/DRIVE_FOLDER_ID`

### 5.4 Déployer la fonction

```bash
supabase functions deploy google-drive
```

## Étape 6: Configurer le frontend

### 6.1 Variables d'environnement (.env)

```env
VITE_GOOGLE_DRIVE_API_URL=https://votre-projet.supabase.co/functions/v1/google-drive
```

### 6.2 Utilisation dans l'application

Le service Google Drive est configuré dans `src/lib/googleDrive.ts`.

### Upload un fichier

```typescript
import { googleDriveService } from './lib/googleDrive';

const file = new File(['content'], 'document.pdf', { type: 'application/pdf' });
const uploadedFile = await googleDriveService.uploadFile(file, folderId, animalId);
console.log('Fichier uploadé:', uploadedFile.webViewLink);
```

### Créer un dossier pour un animal

```typescript
const folderId = await googleDriveService.createAnimalFolder(animalId, animalName);
// Stockez folderId dans la table animals
```

### Lister les fichiers

```typescript
const files = await googleDriveService.listFiles(folderId);
```

## Structure des dossiers Google Drive

```
PHÉNIX/ (dossier principal partagé avec le Service Account)
├── Animal_Rex_123e4567/
│   ├── veterinaire/
│   ├── adoption/
│   ├── justice/
│   ├── photos/
│   └── contrats/
├── Animal_Mittens_789f0123/
│   └── ...
```

## Sécurité

- **Credentials backend** : Le fichier JSON du Service Account est stocké dans Supabase Secrets, jamais dans le frontend
- **Authentification Supabase** : Vos utilisateurs doivent être authentifiés via Supabase pour accéder aux fichiers
- **Permissions Drive** : Le Service Account a accès au dossier PHÉNIX uniquement
- **Partage public** : Les fichiers sont rendus partageables via lien public pour affichage dans l'application

## Déploiement complet

Pour le déploiement complet sur GitHub et Vercel, suivez le guide `DEPLOYMENT_GUIDE.md`.
