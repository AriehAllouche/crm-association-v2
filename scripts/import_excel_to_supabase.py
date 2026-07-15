"""
Script d'import des données du fichier Excel vers Supabase
Ce script lit le fichier Excel de l'association et importe les données dans la base de données Supabase
"""

import pandas as pd
import os
from datetime import datetime
import sys
from dotenv import load_dotenv
from supabase import create_client, Client

# Charger les variables d'environnement depuis le fichier .env
load_dotenv()

# Configuration Supabase
SUPABASE_URL = os.getenv('VITE_SUPABASE_URL') or os.getenv('SUPABASE_URL')
# Utiliser la clé service_role pour contourner les RLS lors de l'import
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('VITE_SUPABASE_ANON_KEY') or os.getenv('SUPABASE_ANON_KEY') or os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Erreur: Variables d'environnement Supabase non trouvées.")
    print("Vérifiez que votre fichier .env contient VITE_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY")
    print("Pour l'import, utilisez la clé service_role pour contourner les RLS.")
    sys.exit(1)

print(f"URL Supabase: {SUPABASE_URL}")
print(f"Type de clé: {'service_role' if 'service_role' in os.environ else 'anon'}")

def parse_boolean(value):
    """Convertit les valeurs Excel en booléen"""
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.upper() in ['TRUE', 'VRAI', 'OUI', 'YES', '1']
    return bool(value)

def parse_date(value):
    """Convertit les valeurs Excel en date"""
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, str):
        try:
            # Format français DD/MM/YYYY
            if '/' in value:
                return datetime.strptime(value, '%d/%m/%Y').date()
            # Format ISO YYYY-MM-DD
            elif '-' in value:
                return datetime.strptime(value, '%Y-%m-%d').date()
        except:
            pass
    return None

def clean_text(value):
    """Nettoie les valeurs textuelles"""
    if pd.isna(value):
        return None
    if isinstance(value, str):
        return value.strip() if value.strip() else None
    return str(value) if value is not None else None

def import_excel_to_supabase(excel_file_path):
    """Importe les données du fichier Excel vers Supabase"""
    
    # Initialisation du client Supabase
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Lecture du fichier Excel (en-tête sur la ligne 4, index 3)
    print(f"Lecture du fichier Excel: {excel_file_path}")
    df = pd.read_excel(excel_file_path, header=3)
    
    print(f"Nombre de lignes à importer: {len(df)}")
    print(f"Colonnes trouvées: {list(df.columns)}")
    
    # Afficher les 2 premières lignes pour debug
    print(f"\nPremière ligne de données:")
    print(df.iloc[0].to_dict())
    
    # Mapping des colonnes Excel vers les champs de la base de données
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
    
    # Vérifier quelles colonnes sont mappées
    print(f"\nVérification du mapping:")
    for excel_col, db_field in column_mapping.items():
        found = excel_col in df.columns
        print(f"  {excel_col} -> {db_field}: {'✓' if found else '✗'}")
    
    # Compteurs
    imported = 0
    errors = 0
    
    # Importation ligne par ligne
    for index, row in df.iterrows():
        try:
            # Création du dictionnaire de données
            animal_data = {}
            
            # Mapping des colonnes
            for excel_col, db_field in column_mapping.items():
                if excel_col in df.columns:
                    value = row[excel_col]
                    
                    # Conversion selon le type de champ
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
            
            # Déduction de l'espèce à partir de species_race
            if 'species_race' in animal_data and animal_data['species_race']:
                species_race = animal_data['species_race'].lower()
                if 'chat' in species_race or 'chaton' in species_race:
                    animal_data['espece'] = 'chat'
                elif 'chien' in species_race or 'dog' in species_race:
                    animal_data['espece'] = 'chien'
                elif 'lapin' in species_race:
                    animal_data['espece'] = 'autre'
                else:
                    animal_data['espece'] = 'chien'  # Par défaut
            
            # Déduction du sexe
            if 'gender' in animal_data and animal_data['gender']:
                if animal_data['gender'] == 'M':
                    animal_data['sexe'] = 'male'
                elif animal_data['gender'] == 'F':
                    animal_data['sexe'] = 'femelle'
            
            # Déduction du statut principal
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
            
            # Insertion dans Supabase
            result = supabase.table('animals').insert(animal_data).execute()
            
            imported += 1
            if imported % 10 == 0:
                print(f"Importé: {imported}/{len(df)}")
                
        except Exception as e:
            errors += 1
            print(f"Erreur à la ligne {index + 1}: {e}")
            print(f"Données: {animal_data}")
    
    print(f"\nImport terminé!")
    print(f"Réussi: {imported}")
    print(f"Erreurs: {errors}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        excel_file = sys.argv[1]
    else:
        excel_file = input("Entrez le chemin du fichier Excel: ")
    
    import_excel_to_supabase(excel_file)
