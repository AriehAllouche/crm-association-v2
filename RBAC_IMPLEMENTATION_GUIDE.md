# Guide d'Implémentation RBAC - CRM Association Protection Animale

Ce guide vous accompagne dans la mise en place du système de contrôle d'accès basé sur les rôles (RBAC) pour votre CRM.

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Installation de la base de données](#installation-de-la-base-de-données)
3. [Configuration de l'application](#configuration-de-lapplication)
4. [Création du compte administrateur](#création-du-compte-administrateur)
5. [Test du système](#test-du-système)
6. [Dépannage](#dépannage)

---

## 🔧 Prérequis

- Compte Supabase actif avec projet créé
- Accès au SQL Editor de Supabase
- Node.js et npm installés localement
- Variables d'environnement configurées

---

## 🗄️ Installation de la base de données

### Étape 1: Exécuter la migration des tables

1. Connectez-vous à votre projet Supabase
2. Allez dans le **SQL Editor**
3. Copiez le contenu du fichier `supabase/migrations/001_rbac_tables.sql`
4. Exécutez le script SQL

Ce script crée les tables suivantes:
- `roles` - Rôles utilisateurs
- `permissions` - Permissions du système
- `user_roles` - Relation utilisateurs-rôles
- `role_permissions` - Relation rôles-permissions
- Met à jour la table `profiles` avec les champs RBAC

### Étape 2: Exécuter le seed data

1. Dans le **SQL Editor** de Supabase
2. Copiez le contenu du fichier `supabase/migrations/002_rbac_seed_data.sql`
3. Exécutez le script SQL

Ce script crée:
- 8 rôles par défaut (président, administrator, fa_manager, etc.)
- 30+ permissions organisées par ressource
- Attribution automatique des permissions aux rôles selon la matrice RBAC

### Étape 3: Vérifier l'installation

Exécutez cette requête pour vérifier que tout est en place:

```sql
-- Vérifier les rôles
SELECT * FROM roles;

-- Vérifier les permissions
SELECT * FROM permissions;

-- Vérifier les attributions de permissions
SELECT rp.*, r.name as role_name, p.name as permission_name
FROM role_permissions rp
JOIN roles r ON rp.role_id = r.id
JOIN permissions p ON rp.permission_id = p.id;
```

---

## ⚙️ Configuration de l'application

### Étape 1: Variables d'environnement

Assurez-vous que votre fichier `.env` contient:

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon_supabase
```

### Étape 2: Mettre à jour le formulaire d'inscription

Le système RBAC nécessite que le formulaire d'inscription capture la motivation de l'utilisateur. Mettez à jour votre `LoginPage.tsx` pour inclure ce champ:

```tsx
// Dans le formulaire d'inscription, ajoutez:
<div className="form-group">
  <label htmlFor="motivation">Motivation</label>
  <textarea
    id="motivation"
    value={motivation}
    onChange={(e) => setMotivation(e.target.value)}
    placeholder="Pourquoi souhaitez-vous rejoindre l'association ?"
    required
  />
</div>
```

### Étape 3: Mettre à jour la fonction signUp

Dans `AuthContext.tsx`, la fonction `signUp` a déjà été mise à jour pour accepter le paramètre `motivation` et créer l'utilisateur avec le statut `pending`.

---

## 👤 Création du compte administrateur (Arieh)

### Option 1: Via l'interface Supabase

1. Allez dans **Authentication** > **Users** dans Supabase
2. Cliquez sur **Add user**
3. Entrez l'email d'Arieh (ex: arieh@association.com)
4. Définissez un mot de passe temp ora
5. Cliquez sur **Create user**

### Option 2: Via SQL

```sql
-- Créer l'utilisateur via Supabase Auth (nécessite d'être fait manuellement dans l'interface)
-- Puis mettre à jour le profile:

INSERT INTO profiles (id, email, full_name, role, status, active, motivation)
VALUES (
  'UUID_DARIEH',  -- Remplacez par l'UUID réel de l'utilisateur
  'arieh@association.com',
  'Arieh',
  'admin',
  'active',
  true,
  'Administrateur système'
);

-- Attribuer le rôle administrator
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
  'UUID_DARIEH',
  id,
  'UUID_DARIEH'
FROM roles 
WHERE name = 'administrator';
```

### Option 3: Via le premier utilisateur

Si vous n'avez pas encore d'utilisateurs, le premier utilisateur inscrit peut être promu administrateur manuellement:

1. Inscrivez-vous avec le compte d'Arieh
2. Allez dans le SQL Editor
3. Exécutez:

```sql
-- Mettre à jour le statut
UPDATE profiles 
SET status = 'active', active = true 
WHERE email = 'arieh@association.com';

-- Attribuer le rôle administrator
INSERT INTO user_roles (user_id, role_id, assigned_by)
SELECT 
  p.id,
  r.id,
  p.id
FROM profiles p
CROSS JOIN roles r
WHERE p.email = 'arieh@association.com' 
AND r.name = 'administrator';
```

---

## 🧪 Test du système

### Test 1: Inscription d'un nouvel utilisateur

1. Déconnectez-vous si vous êtes connecté
2. Allez sur la page d'inscription
3. Remplissez le formulaire avec:
   - Email: test@example.com
   - Mot de passe: (votre choix)
   - Nom complet: Test User
   - Motivation: "Je souhaite aider comme famille d'accueil"
4. Soumettez le formulaire

**Résultat attendu:**
- Message de confirmation
- Utilisateur créé avec statut `pending`
- Aucun accès au dashboard

### Test 2: Validation par l'administrateur

1. Connectez-vous avec le compte d'Arieh
2. Allez sur `/admin/validation`
3. Vous devriez voir l'utilisateur "Test User" dans la liste
4. Sélectionnez le rôle "Responsable FA"
5. Cliquez sur "Valider"

**Résultat attendu:**
- L'utilisateur disparaît de la liste
- Son statut passe à `active`
- Il reçoit le rôle "fa_manager"

### Test 3: Connexion de l'utilisateur validé

1. Déconnectez-vous
2. Connectez-vous avec test@example.com
3. Vous devriez accéder au dashboard

**Résultat attendu:**
- Dashboard personnalisé pour Responsable FA
- Accès aux sections familles d'accueil
- Pas d'accès aux sections admin ou finances

### Test 4: Vérification des permissions

Dans le navigateur console, exécutez:

```javascript
// Vérifier les permissions chargées
const { profile } = useAuth();
console.log('Rôles:', profile.roles);
console.log('Permissions:', profile.permissions);
```

---

## 🔍 Dépannage

### Problème: Les utilisateurs ne peuvent pas s'inscrire

**Symptôme:** Erreur lors de l'inscription

**Solutions:**
1. Vérifiez que la table `profiles` a les colonnes `status` et `motivation`
2. Vérifiez les RLS policies sur la table `profiles`
3. Consultez les logs Supabase

### Problème: La page d'administration est vide

**Symptôme:** Aucun utilisateur n'apparaît dans la liste de validation

**Solutions:**
1. Vérifiez que vous êtes connecté avec un compte ayant la permission `admin.approve`
2. Exécutez: `SELECT * FROM profiles WHERE status = 'pending';`
3. Vérifiez que les RLS policies permettent la lecture

### Problème: Les permissions ne sont pas chargées

**Symptôme:** L'utilisateur a un rôle mais pas de permissions

**Solutions:**
1. Vérifiez que la vue `user_permissions_view` existe
2. Exécutez: `SELECT * FROM user_permissions_view WHERE user_id = 'VOTRE_USER_ID';`
3. Vérifiez que les rôles ont des permissions attribuées

### Problème: Erreur "Permission refusée"

**Symptôme:** Accès refusé à certaines pages

**Solutions:**
1. Vérifiez que l'utilisateur a le statut `active`
2. Vérifiez que l'utilisateur a les rôles requis
3. Consultez la matrice des permissions dans `ARCHITECTURE_RBAC.md`

---

## 📚 Ressources supplémentaires

- **Architecture complète:** `ARCHITECTURE_RBAC.md`
- **Scripts SQL:** `supabase/migrations/`
- **Types TypeScript:** `src/types/index.ts`
- **Hook permissions:** `src/hooks/usePermissions.ts`
- **Page admin:** `src/pages/AdminValidationPage.tsx`

---

## 🚀 Prochaines étapes

1. **Personnaliser les dashboards:** Adaptez les composants `DashboardPresident.tsx`, `DashboardVeterinary.tsx`, etc. selon vos besoins
2. **Ajouter les notifications:** Implémentez l'envoi d'emails réels via Supabase Auth
3. **Créer des rapports:** Ajoutez des fonctionnalités de reporting par rôle
4. **Audit trail:** Implémentez le logging des actions sensibles

---

## 📞 Support

En cas de problème, vérifiez:
1. Les logs Supabase dans le dashboard
2. La console du navigateur pour les erreurs frontend
3. Les RLS policies dans Supabase

Pour l'architecture détaillée, consultez `ARCHITECTURE_RBAC.md`.
