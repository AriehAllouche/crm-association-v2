# Architecture RBAC - Tableau de Bord Association de Protection Animale

## 1. SCHÉMA CONCEPTUEL DE LA BASE DE DONNÉES

### Diagramme Entité-Association (ERD)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│     USERS       │       │     ROLES       │       │   PERMISSIONS   │
├─────────────────┤       ├─────────────────┤       ├─────────────────┤
│ id (PK)         │◄──────│ id (PK)         │──────►│ id (PK)         │
│ email           │       │ name            │       │ name            │
│ password_hash   │       │ description     │       │ description     │
│ first_name      │       │ is_system_role  │       │ resource        │
│ last_name       │       │ created_at      │       │ action          │
│ phone           │       │ updated_at      │       │ created_at      │
│ status          │       └─────────────────┘       └─────────────────┘
│ created_at      │                                      ▲
│ updated_at      │                                      │
│ last_login      │                                      │
└─────────────────┘                                      │
         │                                               │
         │                                               │
         │              ┌─────────────────┐              │
         └──────────────│  USER_ROLES    │──────────────┘
                        ├─────────────────┤
                        │ user_id (FK)    │
                        │ role_id (FK)    │
                        │ assigned_at     │
                        │ assigned_by     │
                        └─────────────────┘
                                ▲
                                │
                        ┌─────────────────┐
                        │ ROLE_PERMISSIONS│
                        ├─────────────────┤
                        │ role_id (FK)    │
                        │ permission_id   │
                        └─────────────────┘
```

### Tables Détaillées

#### Table: `users`
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    status ENUM('pending', 'active', 'rejected', 'suspended') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_system_admin BOOLEAN DEFAULT FALSE
);
```

#### Table: `roles`
```sql
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    is_system_role BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `permissions`
```sql
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    resource VARCHAR(50) NOT NULL,  -- ex: 'animals', 'families', 'health', 'admin'
    action VARCHAR(50) NOT NULL,    -- ex: 'read', 'write', 'delete', 'manage'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Table: `user_roles`
```sql
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    UNIQUE(user_id, role_id)
);
```

#### Table: `role_permissions`
```sql
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    UNIQUE(role_id, permission_id)
);
```

### Données Initiales (Seed Data)

#### Rôles par défaut
```sql
INSERT INTO roles (name, description, is_system_role) VALUES
('president', 'Présidente - Accès total (Super-Admin)', FALSE),
('administrator', 'Administrateur - Gestion technique', FALSE),
('fa_manager', 'Responsable FA - Gestion familles d''accueil', FALSE),
('veterinary_manager', 'Responsable vétérinaire - Pôle santé', FALSE),
('communication_manager', 'Responsable communication - Fiches adoption', FALSE),
('investigator', 'Enquêteur - Signalements maltraitance', FALSE),
('educator', 'Éducateur - Comportement animaux', FALSE),
('treasurer', 'Trésorier - Comptabilité et finances', FALSE);
```

#### Permissions par ressource
```sql
INSERT INTO permissions (name, description, resource, action) VALUES
-- Dashboard
('dashboard.view', 'Voir le tableau de bord', 'dashboard', 'read'),
('dashboard.manage', 'Gérer le tableau de bord', 'dashboard', 'manage'),

-- Animaux
('animals.read', 'Voir les fiches animaux', 'animals', 'read'),
('animals.write', 'Créer/modifier fiches animaux', 'animals', 'write'),
('animals.delete', 'Supprimer des animaux', 'animals', 'delete'),

-- Santé
('health.read', 'Voir les suivis médicaux', 'health', 'read'),
('health.write', 'Créer/modifier suivis médicaux', 'health', 'write'),
('health.manage', 'Gérer les stocks médicaments', 'health', 'manage'),

-- Familles d'Accueil
('families.read', 'Voir les familles d''accueil', 'families', 'read'),
('families.write', 'Créer/modifier familles d''accueil', 'families', 'write'),
('families.manage', 'Gérer les contrats et placements', 'families', 'manage'),

-- Communication
('communication.read', 'Voir les fiches adoption', 'communication', 'read'),
('communication.write', 'Créer/modifier fiches adoption', 'communication', 'write'),
('communication.publish', 'Publier sur les réseaux sociaux', 'communication', 'publish'),

-- Enquêtes
('investigations.read', 'Voir les signalements', 'investigations', 'read'),
('investigations.write', 'Créer/modifier enquêtes', 'investigations', 'write'),
('investigations.manage', 'Gérer les pré-visites', 'investigations', 'manage'),

-- Éducation
('education.read', 'Voir les fiches comportement', 'education', 'read'),
('education.write', 'Créer/modifier suivis éducatifs', 'education', 'write'),

-- Finance
('finance.read', 'Voir la comptabilité', 'finance', 'read'),
('finance.write', 'Créer/modifier écritures', 'finance', 'write'),
('finance.manage', 'Gérer les factures et dons', 'finance', 'manage'),

-- Administration
('admin.users', 'Gérer les utilisateurs', 'admin', 'users'),
('admin.roles', 'Gérer les rôles et permissions', 'admin', 'roles'),
('admin.approve', 'Approuver les nouveaux inscrits', 'admin', 'approve'),
('admin.settings', 'Configurer l''application', 'admin', 'settings');
```

---

## 2. MATRICE DES PERMISSIONS PAR RÔLE

| Permission | Présidente | Admin | Resp. FA | Resp. Vét. | Comm. | Enquêteur | Éducateur | Trésorier |
|------------|------------|-------|----------|------------|-------|-----------|-----------|-----------|
| **Dashboard** |
| dashboard.view | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| dashboard.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Animaux** |
| animals.read | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| animals.write | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| animals.delete | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Santé** |
| health.read | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| health.write | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| health.manage | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Familles d'Accueil** |
| families.read | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| families.write | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| families.manage | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Communication** |
| communication.read | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| communication.write | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| communication.publish | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **Enquêtes** |
| investigations.read | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| investigations.write | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| investigations.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Éducation** |
| education.read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| education.write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| **Finance** |
| finance.read | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| finance.write | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| finance.manage | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Administration** |
| admin.users | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin.roles | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin.approve | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| admin.settings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## 3. DESIGN D'INTERFACE (MOCKUPS)

### 3.1 Tableau de Bord - Présidente (Super-Admin)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🐾 Association Protection Animale          👩 Marie Dupont  [Déconnexion] │
├─────────────────────────────────────────────────────────────────────────────┤
│  📊 Vue d'ensemble                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 127 Animaux  │  │   45 FA     │  │ 12 En attente│  │  8 Enquêtes  │   │
│  │   en refuge  │  │  actives    │  │  validation  │  │  en cours    │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📈 Statistiques du mois                                              │   │
│  │ • 15 animaux adoptés  • 8 nouvelles FA  • 3 enquêtes clôturées     │   │
│  │ • 2 450€ de dons     • 12 visites vétérinaires                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ ⚠️ Alertes récentes                                                  │   │
│  │ • Stock de vaccins faible (3 unités restantes)                      │   │
│  │ • 3 contrats FA expirent dans 7 jours                               │   │
│  │ • Nouveau signalement maltraitance - Lyon                           │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🏠 Animaux  🏠 FA  🩺 Santé  📢 Comm.  👮 Enquêtes  👨‍🏫 Éduc.  💰 Finance  ⚙️ Admin│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Tableau de Bord - Responsable Vétérinaire

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🐾 Association Protection Animale          🩺 Dr. Martin  [Déconnexion] │
├─────────────────────────────────────────────────────────────────────────────┤
│  🩺 Pôle Santé                                                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 8 RDV        │  │   23 Soins   │  │ 3 Urgences   │  │  Stock ↓     │   │
│  │  ce jour     │  │  en cours   │  │  à traiter   │  │  alerte      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📅 Rendez-vous vétérinaires aujourd'hui                              │   │
│  │ • 09:00 - Max (chien) - Vaccination                                  │   │
│  │ • 10:30 - Luna (chat) - Stérilisation                               │   │
│  │ • 14:00 - Rocky (chien) - Bilan de santé                             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 💊 État des stocks médicamenteux                                     │   │
│  │ • Vaccins rage: 12 unités  • Antibiotiques: 8 unités                │   │
│  │ • Antiparasitaires: 15 unités  • Pansements: 45 unités               │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  🩺 Suivis médicaux  📅 RDV vétérinaires  💊 Stocks  📋 Fiches soins        │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Tableau de Bord - Responsable FA

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🐾 Association Protection Animale          🏠 Sophie  [Déconnexion]       │
├─────────────────────────────────────────────────────────────────────────────┤
│  🏠 Gestion Familles d'Accueil                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ 45 FA        │  │   38 Animaux │  │ 7 Demandes   │  │  3 Contrats  │   │
│  │  actives     │  │  placés     │  │  en attente  │  │  à renouveler│   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📋 Familles d'accueil récemment inscrites                           │   │
│  │ • Jean-Pierre M. - Disponible chiens < 15kg - Lyon                   │   │
│  │ • Claire L. - Disponible chats - Villeurbanne                       │   │
│  │ • Marc D. - Disponible chiens tous formats - Vénissieux             │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🏠 Animaux actuellement placés                                      │   │
│  │ • Max (chien) chez Famille Martin depuis 45 jours                   │   │
│  │ • Luna (chat) chez Famille Dupont depuis 12 jours                   │   │
│  │ • Rocky (chien) chez Famille Bernard depuis 3 jours                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  👥 Liste FA  📝 Disponibilités  📄 Contrats  🔄 Placements               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 Page Administration - Arieh (Validation des inscrits)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  🐾 Association Protection Animale          ⚙️ Arieh (Admin)  [Déconnexion]│
├─────────────────────────────────────────────────────────────────────────────┤
│  ⚙️ Administration - Validation des nouveaux inscrits                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 🔍 Filtres: [En attente ▼]  [Tous les rôles ▼]  [Rechercher...    ] │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Nouveaux inscrits en attente de validation (8)                       │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ 👤 Pierre Lefebvre                    pierre.lefebvre@email.com   │ │   │
│  │ │ Inscrit le: 15/07/2026 à 14:32        📞 06 12 34 56 78         │ │   │
│  │ │ Motivation: "Bénévole depuis 5 ans, souhaite aider les FA"      │ │   │
│  │ │                                                                 │ │   │
│  │ │ Attribuer rôle: [Responsable FA ▼]                               │ │   │
│  │ │                                                                 │ │   │
│  │ │ [✅ Valider et activer]  [❌ Refuser]  [📧 Demander infos]        │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ 👤 Dr. Sarah Bernard                  sarah.bernard@email.com     │ │   │
│  │ │ Inscrit le: 14/07/2026 à 09:15        📞 06 98 76 54 32         │ │   │
│  │ │ Motivation: "Vétérinaire bénévole, disponible weekends"         │ │   │
│  │ │                                                                 │ │   │
│  │ │ Attribuer rôle: [Responsable vétérinaire ▼]                      │ │   │
│  │ │                                                                 │ │   │
│  │ │ [✅ Valider et activer]  [❌ Refuser]  [📧 Demander infos]        │ │   │
│ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  │ ┌─────────────────────────────────────────────────────────────────┐ │   │
│  │ │ 👤 Marc Dubois                      marc.dubois@email.com         │ │   │
│  │ │ Inscrit le: 13/07/2026 à 18:45        📞 07 55 44 33 22         │ │   │
│  │ │ Motivation: "Éducateur canin certifié"                         │ │   │
│  │ │                                                                 │ │   │
│  │ │ Attribuer rôle: [Éducateur ▼]                                   │ │   │
│  │ │                                                                 │ │   │
│  │ │ [✅ Valider et activer]  [❌ Refuser]  [📧 Demander infos]        │ │   │
│  │ └─────────────────────────────────────────────────────────────────┘ │   │
│  │                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 📊 Statistiques                                                     │   │
│  │ • 8 en attente  • 45 validés ce mois  • 3 refusés ce mois          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  👥 Utilisateurs  🔐 Rôles  ✅ Validation  ⚙️ Configuration              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 Modal de Confirmation (Validation)

```
┌──────────────────────────────────────────────────────────┐
│  ✅ Confirmer la validation                              │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Vous allez valider l'inscription de :                   │
│                                                          │
│  👤 Pierre Lefebvre                                      │
│  📧 pierre.lefebvre@email.com                            │
│                                                          │
│  Rôle attribué :                                         │
│  🏠 Responsable FA                                       │
│                                                          │
│  ⚠️ Cette action :                                       │
│  • Activera le compte de l'utilisateur                  │
│  • Lui enverra un email de confirmation                 │
│  • Lui donnera accès à son tableau de bord personnalisé  │
│                                                          │
│  [❌ Annuler]  [✅ Confirmer et activer]                 │
└──────────────────────────────────────────────────────────┘
```

---

## 4. FLUX UTILISATEUR (USER FLOW)

### 4.1 Diagramme de Séquence - Inscription et Validation

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  Nouvel     │       │ Application │       │  Base de    │       │   Arieh     │
│  Utilisateur│       │     Web     │       │  Données    │       │  (Admin)    │
└─────────────┘       └─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │                     │
       │ 1. Clique "S'inscrire"                    │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │ 2. Remplit formulaire │                     │                     │
       │ (nom, email, password,│                   │                     │
       │  motivation)         │                     │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │                     │ 3. Crée user        │                     │
       │                     │ (status=pending)    │                     │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │                     │                     │ 4. Stocke user      │
       │                     │                     │ (sans rôle)         │
       │                     │                     │                     │
       │ 5. Affiche "Compte en │                   │                     │
       │ attente de validation"│                   │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
       │ 6. Email de confirmation│                 │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
       │                     │                     │                     │
       │                     │                     │ 7. Notifie Arieh    │
       │                     │                     │ (nouveau user)      │
       │                     │                     │────────────────────>│
       │                     │                     │                     │
       │                     │                     │                     │
       │                     │                     │                     │ 8. Consulte
       │                     │                     │                     │ page Admin
       │                     │                     │                     │
       │                     │                     │                     │ 9. Attribue rôle
       │                     │                     │                     │ et valide
       │                     │                     │                     │
       │                     │                     │<────────────────────│
       │                     │                     │                     │
       │                     │                     │ 10. Update user     │
       │                     │                     │ (status=active)     │
       │                     │                     │ + assigne rôle      │
       │                     │                     │                     │
       │                     │ 11. Email activation│                     │
       │                     │────────────────────>│                     │
       │ 12. Reçoit email activation│             │                     │
       │<────────────────────│                     │                     │
       │                     │                     │                     │
       │ 13. Se connecte     │                     │                     │
       │────────────────────>│                     │                     │
       │                     │                     │                     │
       │                     │ 14. Vérifie status  │                     │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │                     │ 15. Récupère rôles  │                     │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │                     │ 16. Récupère permissions│                  │
       │                     │────────────────────>│                     │
       │                     │                     │                     │
       │ 17. Affiche dashboard│                    │                     │
       │ personnalisé        │                     │                     │
       │<────────────────────│                     │                     │
```

### 4.2 Étapes Détaillées

#### Étape 1: Inscription
1. L'utilisateur accède à la page d'inscription
2. Il remplit le formulaire avec:
   - Nom, Prénom
   - Email
   - Mot de passe
   - Téléphone (optionnel)
   - Motivation (texte libre)
3. Soumission du formulaire

#### Étape 2: Création du compte (statut pending)
1. L'application crée l'utilisateur en base de données
2. Le statut est défini sur `pending`
3. Aucun rôle n'est attribué
4. Un email de confirmation d'inscription est envoyé

#### Étape 3: Notification à Arieh
1. Arieh reçoit une notification (email + dans l'application)
2. Il accède à la page "Administration > Validation"
3. Il voit le nouvel utilisateur dans la liste des "En attente"

#### Étape 4: Validation par Arieh
1. Arieh consulte le profil du nouvel utilisateur
2. Il sélectionne un (ou plusieurs) rôle(s) dans le menu déroulant
3. Il clique sur "Valider et activer"
4. Confirmation via modal

#### Étape 5: Activation du compte
1. Le statut de l'utilisateur passe à `active`
2. Le(s) rôle(s) sont assignés dans la table `user_roles`
3. Un email d'activation est envoyé à l'utilisateur
4. L'utilisateur peut maintenant se connecter

#### Étape 6: Connexion et affichage du dashboard
1. L'utilisateur se connecte avec ses identifiants
2. L'application vérifie que le statut est `active`
3. L'application récupère les rôles de l'utilisateur
4. L'application récupère les permissions associées aux rôles
5. Le dashboard est généré dynamiquement selon les permissions:
   - Menu latéral personnalisé
   - Widgets affichés selon les ressources accessibles
   - Actions disponibles selon les permissions (read/write/manage)

### 4.3 Cas d'erreur et gestion des refus

#### Refus d'inscription
1. Arieh clique sur "Refuser"
2. Modal de confirmation s'affiche avec champ "Motif du refus"
3. Le statut passe à `rejected`
4. Un email de refus est envoyé avec le motif

#### Demande d'informations complémentaires
1. Arieh clique sur "Demander infos"
2. Modal s'affiche pour rédiger un message
3. Un email est envoyé à l'utilisateur
4. Le statut reste `pending`
5. L'utilisateur peut répondre via email ou via l'application

---

## 5. IMPLÉMENTATION TECHNIQUE RECOMMANDÉE

### 5.1 Structure du projet (Frontend)

```
src/
├── components/
│   ├── dashboard/
│   │   ├── DashboardPresident.tsx
│   │   ├── DashboardVeterinary.tsx
│   │   ├── DashboardFAManager.tsx
│   │   └── DashboardLayout.tsx
│   ├── admin/
│   │   ├── UserValidationList.tsx
│   │   ├── UserValidationCard.tsx
│   │   └── RoleSelector.tsx
│   └── auth/
│       ├── LoginForm.tsx
│       ├── RegisterForm.tsx
│       └── ProtectedRoute.tsx
├── context/
│   ├── AuthContext.tsx
│   └── PermissionContext.tsx
├── hooks/
│   ├── useAuth.ts
│   ├── usePermissions.ts
│   └── useRoles.ts
├── lib/
│   ├── api/
│   │   ├── auth.ts
│   │   ├── users.ts
│   │   └── roles.ts
│   └── rbac.ts
└── types/
    ├── user.ts
    ├── role.ts
    └── permission.ts
```

### 5.2 Middleware d'autorisation (Backend)

```typescript
// middleware/authorization.ts
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    
    const hasPermission = await checkUserPermission(user.id, permission);
    
    if (!hasPermission) {
      return res.status(403).json({ error: 'Permission refusée' });
    }
    
    next();
  };
};

// Exemple d'utilisation dans une route
router.get('/api/animals', requirePermission('animals.read'), getAnimals);
router.post('/api/animals', requirePermission('animals.write'), createAnimal);
router.delete('/api/animals/:id', requirePermission('animals.delete'), deleteAnimal);
```

### 5.3 Hook de permissions (Frontend)

```typescript
// hooks/usePermissions.ts
export const usePermissions = () => {
  const { user } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);
  
  useEffect(() => {
    if (user?.roles) {
      const userPermissions = user.roles.flatMap(role => role.permissions);
      setPermissions(userPermissions.map(p => p.name));
    }
  }, [user]);
  
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };
  
  const hasAnyPermission = (permissionList: string[]) => {
    return permissionList.some(p => permissions.includes(p));
  };
  
  const hasAllPermissions = (permissionList: string[]) => {
    return permissionList.every(p => permissions.includes(p));
  };
  
  return { permissions, hasPermission, hasAnyPermission, hasAllPermissions };
};
```

---

## 6. SÉCURITÉ ET BONNES PRATIQUES

### 6.1 Sécurité
- **Hash des mots de passe**: Utiliser bcrypt ou argon2
- **JWT tokens**: Tokens avec expiration courte (15-30 min)
- **Refresh tokens**: Stockés en HTTP-only cookies
- **Rate limiting**: Limiter les tentatives de connexion
- **HTTPS**: Obligatoire en production
- **Validation des entrées**: Sanitization côté serveur

### 6.2 Audit trail
- Journaliser toutes les actions sensibles:
  - Attribution de rôles
  - Validation/refus d'utilisateurs
  - Modifications de permissions
  - Actions de suppression

### 6.3 Tests
- Tests unitaires pour les fonctions RBAC
- Tests d'intégration pour les flux d'authentification
- Tests E2E pour les scénarios utilisateur

---

Ce document fournit une architecture complète et prête à l'implémentation pour votre système de gestion des droits d'accès.
