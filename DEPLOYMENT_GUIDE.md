# Guide de Déploiement PHÉNIX V1.0

## Architecture

- **Frontend**: Vite + React + TypeScript (déployé sur Vercel - gratuit)
- **Backend**: Supabase (PostgreSQL + Auth + Edge Functions - gratuit)
- **Stockage**: Google Drive via Service Account (gratuit)
- **Hébergement**: Vercel (gratuit)

## Étape 1: Configurer Supabase

### 1.1 Créer un projet Supabase

1. Allez sur [supabase.com](https://supabase.com)
2. Créez un nouveau projet
3. Notez l'URL et la clé anon

### 1.2 Exécuter les migrations

1. Ouvrez le SQL Editor dans Supabase
2. Exécutez le fichier `supabase/migrations/20260714_phenix_v1_timeline_and_fa_scoring.sql`

### 1.3 Configurer les Supabase Secrets pour Google Drive

```bash
# Installer Supabase CLI
npm install -g supabase

# Se connecter à votre projet
supabase login
supabase link --project-ref votre-projet-id

# Configurer les secrets
supabase secrets set SERVICE_ACCOUNT_EMAIL="votre-email@project.iam.gserviceaccount.com"
supabase secrets set SERVICE_ACCOUNT_KEY="$(cat votre-cle-service-account.json)"
supabase secrets set DRIVE_FOLDER_ID="votre-dossier-id-drive"
```

### 1.4 Déployer l'Edge Function Google Drive

```bash
# Déployer la fonction
supabase functions deploy google-drive
```

## Étape 2: Configurer le Frontend

### 2.1 Variables d'environnement

Créez un fichier `.env` à la racine:

```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-anon
VITE_GOOGLE_DRIVE_API_URL=https://votre-projet.supabase.co/functions/v1/google-drive
```

### 2.2 Installer les dépendances

```bash
npm install
```

### 2.3 Tester localement

```bash
npm run dev
```

## Étape 3: Déployer sur Vercel

### 3.1 Créer un repository GitHub

1. Initialisez git dans votre projet:
```bash
git init
git add .
git commit -m "Initial commit"
```

2. Créez un repository sur GitHub
3. Connectez votre projet:
```bash
git remote add origin https://github.com/votre-username/crm-association-v2.git
git branch -M main
git push -u origin main
```

### 3.2 Déployer sur Vercel

1. Allez sur [vercel.com](https://vercel.com)
2. Cliquez sur "Add New Project"
3. Importez votre repository GitHub
4. Configurez les variables d'environnement dans Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_GOOGLE_DRIVE_API_URL`
5. Cliquez sur "Deploy"

### 3.3 Configuration Vercel (optionnel)

Créez un fichier `vercel.json` à la racine:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "framework": "vite"
}
```

## Étape 4: Vérifier le déploiement

1. Vérifiez que le frontend est accessible sur Vercel
2. Testez l'authentification Supabase
3. Testez l'upload de fichiers sur Google Drive

## Coûts

- **Vercel**: Gratuit (Hobby plan)
- **Supabase**: Gratuit (500MB database, 1GB bandwidth)
- **Google Drive**: Gratuit (15GB storage)
- **Total**: 0€/mois

## Mises à jour futures

Pour déployer des mises à jour:

```bash
git add .
git commit -m "Description des changements"
git push
```

Vercel déploiera automatiquement à chaque push sur main.

## Dépannage

### Erreur: Service Account key not configured

Vérifiez que les secrets Supabase sont bien configurés:
```bash
supabase secrets list
```

### Erreur: CORS

L'Edge Function gère déjà CORS. Vérifiez que les headers sont corrects.

### Erreur: Upload échoue

Vérifiez que:
- Le dossier Drive est partagé avec le Service Account
- Le Service Account a les permissions nécessaires
- La clé JSON est valide
