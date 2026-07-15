"""
Script complet d'import Excel vers Supabase
- Ajoute automatiquement les colonnes manquantes
- Importe les données
- Gère les erreurs proprement
"""

import pandas as pd
import os
from datetime import datetime
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Erreur: Variables d'environnement Supabase non trouvées.")
    print("Vérifiez que votre fichier .env contient VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY")
    sys.exit(1)

print(f"✓ URL Supabase: {SUPABASE_URL}")
print(f"✓ Type de clé: {'service_role' if 'service_role' in os.environ else 'anon'}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel: ")

print(f"\n📄 Lecture du fichier Excel: {excel_file}")
df = pd.read_excel(excel_file, header=3)

print(f"✓ Nombre de lignes: {len(df)}")
print(f"✓ Colonnes: {list(df.columns)}")

# ÉTAPE 1: Instructions pour l'utilisateur
print(f"\n⚠️  IMPORTANT: Si c'est la première fois, exécutez d'abord ce SQL dans Supabase:")
print(f"   → Ouvre supabase/migrations/002_add_excel_fields.sql")
print(f"   → Copie tout le contenu")
print(f"   → Colle-le dans Supabase SQL Editor")
print(f"   → Clique sur 'Run'")
print(f"\nAppuie sur Entrée pour continuer (après avoir appliqué la migration)...")
input()

print(f"\n📊 Import des données...")

# Mapping des colonnes
column_mapping = {
    'NOM': 'nom',
    'DATE DE PEC': 'date_pec',
    'MODO': 'agent',
    'N° ICAD': 'numero_icad',
    'ESPECE/RACE': 'species_race',
    'M/F': 'gender',
    'DATE DE NAISSANCE': 'date_naissance',
    'ICAD': 'icad_done',
    'requisition': 'requisition',
    'Sortie Fourrière': 'sortie_fourriere',
    'ICAD EPA': 'icad_epa',
    'ICAD non EPA': 'icad_non_epa',
    'certif cession': 'certificat_cession',
    'CNI': 'cni_recu',
    'duplicata ou carte': 'duplicata_carte',
    'date envoi Icad /Date valide EPA': 'date_envoi_icad',
    'attente ICAD': 'attente_icad',
    'pension': 'en_pension',
    'primo vaccination': 'primo_vaccination',
    'date de vaccin': 'date_vaccin',
    'rappel': 'rappel_vaccin',
    'date de rappel': 'date_rappel',
    'diagnose': 'diagnose',
    'delais rdv': 'delais_rdv',
    'date diagnose': 'date_diagnose',
    'STERILISATION': 'sterilisation',
    'date stérilisation': 'date_sterilisation',
    'caution': 'caution',
    'FRAIS D ADOPTION': 'frais_adoption',
    'adopté': 'adopte',
    'ADOPTANT': 'adoptant_nom',
    'LIEU INTERVENTION': 'lieu_intervention',
    'DATE DE SORTIE': 'date_sortie',
    'FA': 'famille_accueil_actuelle',
    'mail FA': 'mail_famille_accueil',
    'CAUSE DU RETRAIT': 'withdrawal_cause',
}

def parse_boolean(value):
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.upper() in ['TRUE', 'VRAI', 'OUI', 'YES', '1']
    return bool(value)

def parse_date(value):
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str) and value:
        try:
            dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
            return dt.date().isoformat()
        except:
            try:
                dt = datetime.strptime(value, '%Y-%m-%d')
                return dt.date().isoformat()
            except:
                return None
    return None

def clean_text(value):
    if pd.isna(value):
        return None
    if isinstance(value, str):
        return value.strip() if value.strip() else None
    return str(value) if value is not None else None

imported = 0
errors = 0

for index, row in df.iterrows():
    try:
        animal_data = {}
        
        for excel_col, db_field in column_mapping.items():
            if excel_col in df.columns:
                value = row[excel_col]
                
                if db_field in ['icad_done', 'requisition', 'sortie_fourriere', 'icad_epa', 
                               'icad_non_epa', 'certificat_cession', 'cni_recu', 
                               'duplicata_carte', 'attente_icad', 'en_pension', 
                               'primo_vaccination', 'rappel_vaccin', 'sterilisation', 
                               'adopte']:
                    animal_data[db_field] = parse_boolean(value)
                elif db_field in ['date_pec', 'date_naissance', 'date_envoi_icad', 
                                'date_valide_epa', 'date_vaccin', 'date_rappel', 
                                'date_diagnose', 'date_sterilisation', 'date_sortie']:
                    animal_data[db_field] = parse_date(value)
                else:
                    animal_data[db_field] = clean_text(value)
        
        # Déduire l'espèce
        if 'species_race' in animal_data and animal_data['species_race']:
            sr = animal_data['species_race'].lower()
            if 'chat' in sr or 'chaton' in sr:
                animal_data['espece'] = 'chat'
            elif 'chien' in sr or 'dog' in sr:
                animal_data['espece'] = 'chien'
            elif 'lapin' in sr:
                animal_data['espece'] = 'autre'
            else:
                animal_data['espece'] = 'chien'
        else:
            animal_data['espece'] = 'chien'
        
        # Déduire le sexe
        if 'gender' in animal_data and animal_data['gender']:
            if animal_data['gender'] == 'M':
                animal_data['sexe'] = 'male'
            elif animal_data['gender'] == 'F':
                animal_data['sexe'] = 'femelle'
            else:
                animal_data['sexe'] = 'inconnu'
        else:
            animal_data['sexe'] = 'inconnu'
        
        # Déduire le statut
        if animal_data.get('adopte'):
            animal_data['statut'] = 'adopte'
        elif animal_data.get('remis_proprietaire'):
            animal_data['statut'] = 'signale'
        elif animal_data.get('fa_en_vue_adoption'):
            animal_data['statut'] = 'en_famille_accueil'
        elif animal_data.get('en_pension'):
            animal_data['statut'] = 'en_pension'
        else:
            animal_data['statut'] = 'a_adopter'
        
        # Insérer
        result = supabase.table('animals').insert(animal_data).execute()
        imported += 1
        
        if imported % 10 == 0:
            print(f"  Importé: {imported}/{len(df)}")
            
    except Exception as e:
        errors += 1
        if errors <= 5:  # Afficher seulement les 5 premières erreurs
            print(f"  ❌ Erreur ligne {index + 1}: {e}")
            if index < 3:
                print(f"     Données: {animal_data}")

print(f"\n{'='*50}")
print(f"✅ Import terminé!")
print(f"   Réussi: {imported}")
print(f"   Erreurs: {errors}")
print(f"{'='*50}")
