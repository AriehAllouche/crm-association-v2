# Guide d'import des données Excel vers Supabase

## Vue d'ensemble

Ce guide explique comment importer les données du fichier Excel de l'association dans la base de données Supabase.

## Prérequis

1. **Python 3.8+** installé
2. **Dépendances Python** :
   ```bash
   pip install pandas openpyxl supabase python-dotenv
   ```

3. **Fichier .env configuré** :
   - Le script lit automatiquement les variables depuis le fichier `.env` du projet
   - Assurez-vous que `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` sont configurés

## Étapes d'importation

### 1. Appliquer la migration

Avant d'importer les données, appliquez la migration qui ajoute les nouveaux champs :

```bash
# Dans Supabase SQL Editor, exécutez le fichier :
supabase/migrations/002_add_excel_fields.sql
```

### 2. Vérifier le fichier .env

Le script lit automatiquement les variables depuis votre fichier `.env`. Vérifiez qu'il contient :

```env
VITE_SUPABASE_URL=votre_url_supabase
VITE_SUPABASE_ANON_KEY=votre_cle_anon
```

### 3. Exécuter le script d'import

```bash
python scripts/import_excel_to_supabase.py chemin/du/fichier/excel.xlsx
```

## Mapping des colonnes

Le script mappe automatiquement les colonnes Excel vers les champs de la base de données :

| Colonne Excel | Champ Base de données | Type |
|--------------|---------------------|------|
| NOM | nom | TEXT |
| DATE DE PEC | date_pec | DATE |
| MODO | agent | TEXT |
| N° ICAD | numero_icad | TEXT |
| ESPECE/RACE | species_race | TEXT |
| M/F | gender | TEXT |
| DATE DE NAISSANCE | date_naissance | DATE |
| ICAD | icad_done | BOOLEAN |
| requisition | requisition | BOOLEAN |
| Sortie Fourrière | sortie_fourriere | BOOLEAN |
| ICAD EPA | icad_epa | BOOLEAN |
| ICAD non EPA | icad_non_epa | BOOLEAN |
| certif cession | certificat_cession | BOOLEAN |
| CNI | cni_recu | BOOLEAN |
| duplicata ou carte | duplicata_carte | BOOLEAN |
| date envoi Icad /Date valide EPA | date_envoi_icad | DATE |
| attente ICAD | attente_icad | BOOLEAN |
| pension | en_pension | BOOLEAN |
| primo vaccination | primo_vaccination | BOOLEAN |
| date de vaccin | date_vaccin | DATE |
| rappel | rappel_vaccin | BOOLEAN |
| date de rappel | date_rappel | DATE |
| diagnose | diagnose | TEXT |
| delais rdv | delais_rdv | TEXT |
| date diagnose | date_diagnose | DATE |
| STERILISATION | sterilisation | BOOLEAN |
| date stérilisation | date_sterilisation | DATE |
| caution | caution | TEXT |
| FRAIS D ADOPTION | frais_adoption | TEXT |
| adopté | adopte | BOOLEAN |
| ADOPTANT | adoptant_nom | TEXT |
| LIEU INTERVENTION | lieu_intervention | TEXT |
| DATE DE SORTIE | date_sortie | DATE |
| FA | famille_accueil_actuelle | TEXT |
| mail FA | mail_famille_accueil | TEXT |
| CAUSE DU RETRAIT | withdrawal_cause | TEXT |

## Champs calculés automatiquement

Le script déduit automatiquement certains champs :

- **espece**: Déduit de species_race (chat, chien, autre)
- **sexe**: Déduit de gender (M → male, F → femelle)
- **statut**: Déduit des champs booléens (adopte, en_pension, etc.)

## Gestion des erreurs

Le script continue même en cas d'erreur sur une ligne et affiche un résumé à la fin :

- Nombre d'importations réussies
- Nombre d'erreurs
- Détails des erreurs pour debugging

## Nettoyage des données

Le script effectue automatiquement :

- Conversion des dates (format français DD/MM/YYYY et ISO YYYY-MM-DD)
- Conversion des booléens (TRUE, VRAI, OUI, YES, 1 → True)
- Nettoyage des textes (trim des espaces)
- Gestion des valeurs NULL

## Après l'import

1. **Vérifier les données** dans Supabase :
   ```sql
   SELECT COUNT(*) FROM animals;
   ```

2. **Valider les dates et formats** :
   ```sql
   SELECT nom, date_pec, date_naissance 
   FROM animals 
   WHERE date_pec IS NOT NULL 
   LIMIT 10;
   ```

3. **Corriger les éventuelles anomalies** manuellement

## Dépannage

### Erreur de connexion Supabase
- Vérifiez que l'URL et la clé sont correctes
- Utilisez la clé `service_role` pour les droits d'écriture

### Erreur de lecture Excel
- Vérifiez que le fichier est au format .xlsx
- Assurez-vous que les colonnes correspondent au mapping

### Dates non reconnues
- Le script supporte les formats DD/MM/YYYY et YYYY-MM-DD
- Modifiez la fonction `parse_date()` pour d'autres formats

## Support

En cas de problème, vérifiez :
1. Les logs du script pour les messages d'erreur détaillés
2. La structure de votre fichier Excel
3. Les permissions de votre utilisateur Supabase
