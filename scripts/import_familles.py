"""
Script d'import des familles d'accueil validées (OK) vers Supabase
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
    sys.exit(1)

print(f"✓ URL Supabase: {SUPABASE_URL}")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel (ex: Feuille de calcul  ok.xlsx): ")

print(f"\n📄 Lecture du fichier Excel: {excel_file}")
df = pd.read_excel(excel_file, sheet_name='Feuille 1')

print(f"✓ Nombre total de lignes lues: {len(df)}")

def clean_text(value):
    if pd.isna(value):
        return None
    if isinstance(value, str):
        return value.strip() if value.strip() else None
    return str(value).strip()

def clean_code_postal(value):
    if pd.isna(value):
        return None
    value_str = str(value).strip()
    # On ne garde que les caractères numériques
    digits = ''.join([c for c in value_str if c.isdigit()])
    if digits:
        return digits[:5] # Limite à 5 caractères pour un CP standard
    return None

def parse_date(value):
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, str) and value.strip():
        value = value.strip()
        for fmt in ('%d/%m/%Y', '%Y-%m-%d', '%d %m %Y', '%Y-%m-%d %H:%M:%S'):
            try:
                return datetime.strptime(value, fmt).date().isoformat()
            except ValueError:
                continue
    return None

imported = 0
errors = 0

for index, row in df.iterrows():
    try:
        nom_brut = row.get('Nom')
        prenom_brut = row.get('Prénom')
        
        # Ignorer les lignes de séparation ou lignes complètement vides
        if (pd.isna(nom_brut) or str(nom_brut).strip().lower() == 'nan') and \
           (pd.isna(prenom_brut) or str(prenom_brut).strip().lower() == 'nan'):
            continue

        status_final = "Validée"
        
        # Recueil des notes / détails du questionnaire
        details_notes = []
        if clean_text(row.get('Libre / Occupé')): details_notes.append(f"Statut terrain: {row.get('Libre / Occupé')}")
        if clean_text(row.get('Animal')): details_notes.append(f"Animal actuel en garde: {row.get('Animal')}")
        if clean_text(row.get('Profession')): details_notes.append(f"Profession: {row.get('Profession')}")
        if clean_text(row.get('Quel animal pouvez-vous accueillir')): details_notes.append(f"Souhaits accueil: {row.get('Quel animal pouvez-vous accueillir')}")
        if clean_text(row.get("Durée de l'accueil")): details_notes.append(f"Durée dispo: {row.get("Durée de l'accueil")}")
        if clean_text(row.get("Combien d'enfants vivent avec vous ? Merci d'indiquer les âges ")): details_notes.append(f"Enfants/âges: {row.get("Combien d'enfants vivent avec vous ? Merci d'indiquer les âges ")}")
        if clean_text(row.get('Vivez-vous en appartement ou maison ?')): details_notes.append(f"Logement: {row.get('Vivez-vous en appartement ou maison ?')} ({row.get('Superficie :')} m²)")
        if clean_text(row.get('Si oui lesquels :')): details_notes.append(f"Animaux personnels: {row.get('Si oui lesquels :')}")
        if clean_text(row.get("Compléments d'informations")): details_notes.append(f"Notes supp: {row.get("Compléments d'informations")}")
        
        notes_text = " | ".join(details_notes)

        # Mappage vers la table public.famille_accueils
        fa_data = {
            'nom': clean_text(nom_brut).upper() if nom_brut else 'INCONNU',
            'prenom': clean_text(prenom_brut) if prenom_brut else 'Inconnu',
            'adresse': clean_text(row.get('Adresse')),
            'ville': clean_text(row.get('Ville')),
            # Utilisation de la fonction de nettoyage robuste pour le code postal
            'code_postal': clean_code_postal(row.get('Code postal')),
            'telephone': clean_text(row.get('Téléphone')),
            'email': clean_text(row.get('E-mail')),
            'type_logement': clean_text(row.get('Vivez-vous en appartement ou maison ?')),
            'contrat_actif': True,
            'status': status_final,
            'notes': notes_text if notes_text else None,
            'capacite_max': 3
        }
        
        # Insertion
        result = supabase.table('famille_accueils').insert(fa_data).execute()
        imported += 1
        
        if imported % 20 == 0:
            print(f"   Importé: {imported} familles d'accueil...")

    except Exception as e:
        errors += 1
        if errors <= 15:
            print(f"   ❌ Erreur ligne {index + 1} (Nom: {row.get('Nom')}): {e}")

print(f"\n{'='*50}")
print(f"✅ Fin de l'importation !")
print(f"   Familles importées avec succès : {imported}")
print(f"   Erreurs rencontrées : {errors}")
print(f"{'='*50}")