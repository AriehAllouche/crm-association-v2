"""
Script d'import des refus de famille d'accueil vers Supabase
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

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel: ")

print(f"\n📄 Lecture du fichier Excel (Feuille 3): {excel_file}")

# CORRECTION 1 : On lit explicitement l'onglet "Feuille 3" et les entêtes sont à la ligne 0
df = pd.read_excel(excel_file, sheet_name='Feuille 3')

print(f"✓ Nombre de lignes: {len(df)}")

def parse_boolean(value):
    if pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().upper() in ['TRUE', 'VRAI', 'OUI', 'YES', '1']
    return bool(value)

def parse_date(value):
    if pd.isna(value):
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, str) and value.strip():
        value = value.strip()
        for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%d', '%d/%m/%Y', '%d %m %Y'):
            try:
                dt = datetime.strptime(value, fmt)
                return dt.isoformat()
            except ValueError:
                continue
    return None

def clean_text(value):
    if pd.isna(value):
        return None
    if isinstance(value, str):
        return value.strip() if value.strip() else None
    return str(value).strip()

def parse_integer(value):
    if pd.isna(value):
        return None
    try:
        return int(float(value))
    except:
        return None

imported = 0
errors = 0

# CORRECTION 2 : Utilisation des vrais noms de colonnes textuelles au lieu de row.iloc
# ==============================================================================
# REMPLACE TOUTE LA BOUCLE FOR À PARTIR D'ICI DANS TON SCRIPT :
# ==============================================================================

for index, row in df.iterrows():
    try:
        # 1. Sécurité anti-ligne vide ou ligne de séparation en fin de tableau
        nom_brut = row.get('Nom')
        prenom_brut = row.get('Prénom')
        
        # Si la ligne n'a ni nom ni prénom valides (ou juste des nan), on la saute
        if (pd.isna(nom_brut) or str(nom_brut).strip().lower() == 'nan') and \
           (pd.isna(prenom_brut) or str(prenom_brut).strip().lower() == 'nan'):
            continue
            
        # 2. Récupération et nettoyage du type de refus
        type_refus_raw = row.get('REFUS ') or row.get('REFUS')
        type_refus_clean = clean_text(type_refus_raw)
        
        # Si le champ est vide à cause d'un décalage dans l'Excel, on force une valeur textuelle
        if not type_refus_clean or type_refus_clean.lower() == 'nan':
            type_refus_clean = "Historique (Non spécifié)"

        # 3. Construction sécurisée du dictionnaire
        refus_data = {
            'type_refus': type_refus_clean,
            'departement': clean_text(row.get('DPT')),
            'motif_refus': clean_text(row.get('MOTIF DU REFUS')),
            'date_refus': parse_date(row.get('Date')),
            'nom': clean_text(nom_brut) if pd.notna(nom_brut) else 'INCONNU',
            'prenom': clean_text(prenom_brut) if pd.notna(prenom_brut) else 'Inconnu',
            'telephone': clean_text(row.get('Téléphone')),
            'date_naissance': parse_date(row.get('Date de naissance')),
            'adresse': clean_text(row.get('Adresse')),
            'code_postal': clean_text(row.get('Code postal')),
            'ville': clean_text(row.get('Ville')),
            'profession': clean_text(row.get('Profession')),
            'email': clean_text(row.get('E-mail')),
            'pseudo_facebook': clean_text(row.get('Pseudo Facebook')),
            'type_animal_souhaite': clean_text(row.get('Quel animal pouvez-vous accueillir')),
            'peut_accueillir_urgence_2_animaux': parse_boolean(row.get("Pouvez-vous accueillir suivant l'urgence 2 animaux")),
            'duree_accueil': clean_text(row.get("Durée de l'accueil")),
            'nb_adultes': parse_integer(row.get("Combien d'adultes vivent dans votre foyer ?")),
            'nb_enfants': parse_integer(row.get("Combien d'enfants vivent avec vous ? Merci d'indiquer les âges ")) if isinstance(row.get("Combien d'enfants vivent avec vous ? Merci d'indiquer les âges "), (int, float)) else None,
            'ages_enfants': clean_text(row.get("Combien d'enfants vivent avec vous ? Merci d'indiquer les âges ")),
            'famille_accord': parse_boolean(row.get("Les membres de la famille sont-ils tous d'accord pour accueillir un animal en FA ?")),
            'allergies_maladies': parse_boolean(row.get("L'un des membres de la famille souffre-t-il d'asthme, d'allergies ou de maladie pouvant être due au contact avec les animaux ?")),
            'type_logement': clean_text(row.get('Vivez-vous en appartement ou maison ?')),
            'superficie': clean_text(row.get('Superficie :')),
            'autres_animaux': parse_boolean(row.get("L' animal sera-t-il en présence d'autres animaux ? ")),
            'autres_animaux_details': clean_text(row.get('Si oui lesquels :')),
            'peut_isoler_animaux': parse_boolean(row.get('Avez-vous la possibilité de les isoler les uns des autres ?')),
            'attestation_categorie': parse_boolean(row.get("Possédez-vous l'attestation d'aptitude à détenir un chien catégorisé ?")),
            'patience_chiot': parse_boolean(row.get("Pensez-vous avoir la patience nécessaire à l'éducation d'un chiot ou d'un chaton ?")),
            'patience_adulte': parse_boolean(row.get("Pensez-vous avoir la patience nécessaire à l'éducation d'un animal adulte qui a souffert d'abandon ou de maltraitance et qui n'a jamais connu la vie de famille ? ")),
            'animal_seul_journee': parse_boolean(row.get("L'animal restera-t-il seul dans la journée ?")),
            'duree_seul': clean_text(row.get('Si oui, combien de temps ?')),
            'vehicule': parse_boolean(row.get('Etes-vous véhiculée ?')),
            'peut_deplacer': parse_boolean(row.get("Pouvez-vous vous déplacer pour aller récupérer l'animal ou pour vous rendre chez le vétérinaire ?")),
            'informations_complementaires': clean_text(row.get("Compléments d'informations")),
        }
        
        if index == 0:
            print(f"\nPremière ligne de données mappée avec succès :")
            print(refus_data)
        
        # Insertion dans Supabase
        result = supabase.table('refus_famille_accueil').insert(refus_data).execute()
        imported += 1
        
        if imported % 25 == 0:
            print(f"   Importé: {imported} lignes")
            
    except Exception as e:
        errors += 1
        if errors <= 15:
            print(f"   ❌ Erreur ligne {index + 1} (Nom brut détecté: {row.get('Nom')}): {e}")

# ==============================================================================