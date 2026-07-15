"""
Script d'import simplifié - teste uniquement les champs de base
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
    print("Erreur: Variables d'environnement Supabase non trouvées.")
    sys.exit(1)

print(f"URL Supabase: {SUPABASE_URL}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel: ")

print(f"Lecture du fichier Excel: {excel_file}")
df = pd.read_excel(excel_file, header=3)

print(f"Nombre de lignes: {len(df)}")
print(f"Colonnes: {list(df.columns)}")

# Afficher la première ligne
print(f"\nPremière ligne brute:")
print(df.iloc[0].to_dict())

# Mapping simplifié - seulement les champs de base
column_mapping = {
    'NOM': 'nom',
    'DATE DE PEC': 'date_prise_en_charge',  # Adapté au schéma réel
    'MODO': 'agent',
    'N° ICAD': 'numero_icad',
    'ESPECE/RACE': 'race',  # Utiliser race au lieu de species_race
    'M/F': 'sexe',  # Déduire directement en male/femelle/inconnu
    'DATE DE NAISSANCE': 'date_naissance',
}

imported = 0
errors = 0

for index, row in df.iterrows():
    try:
        animal_data = {}
        
        for excel_col, db_field in column_mapping.items():
            if excel_col in df.columns:
                value = row[excel_col]
                
                # Conversion simple
                if pd.isna(value):
                    animal_data[db_field] = None
                elif db_field in ['date_prise_en_charge', 'date_naissance']:
                    if isinstance(value, datetime):
                        animal_data[db_field] = value.isoformat()
                    elif isinstance(value, str) and value:
                        try:
                            # Format Excel datetime
                            dt = datetime.strptime(value, '%Y-%m-%d %H:%M:%S')
                            animal_data[db_field] = dt.date().isoformat()
                        except:
                            try:
                                # Format date simple
                                dt = datetime.strptime(value, '%Y-%m-%d')
                                animal_data[db_field] = dt.date().isoformat()
                            except:
                                animal_data[db_field] = None
                    else:
                        animal_data[db_field] = None
                elif db_field == 'sexe':
                    # Convertir M/F en male/femelle/inconnu
                    if value == 'M':
                        animal_data[db_field] = 'male'
                    elif value == 'F':
                        animal_data[db_field] = 'femelle'
                    else:
                        animal_data[db_field] = 'inconnu'
                else:
                    animal_data[db_field] = str(value).strip() if value else None
        
        # Déduire l'espèce à partir de race
        if 'race' in animal_data and animal_data['race']:
            r = animal_data['race'].lower()
            if 'chat' in r or 'chaton' in r:
                animal_data['espece'] = 'chat'
            elif 'chien' in r or 'dog' in r:
                animal_data['espece'] = 'chien'
            elif 'lapin' in r:
                animal_data['espece'] = 'autre'
            else:
                animal_data['espece'] = 'chien'
        else:
            animal_data['espece'] = 'chien'
        
        # Statut par défaut
        animal_data['statut'] = 'a_adopter'
        
        # Afficher les données avant insertion
        if index == 0:
            print(f"\nDonnées à insérer (première ligne):")
            print(animal_data)
        
        result = supabase.table('animals').insert(animal_data).execute()
        imported += 1
        
        if imported % 10 == 0:
            print(f"Importé: {imported}/{len(df)}")
            
    except Exception as e:
        errors += 1
        print(f"Erreur à la ligne {index + 1}: {e}")
        if index == 0:
            print(f"Données: {animal_data}")

print(f"\nImport terminé!")
print(f"Réussi: {imported}")
print(f"Erreurs: {errors}")
