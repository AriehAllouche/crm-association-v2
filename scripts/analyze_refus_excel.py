"""
Script pour analyser la structure du fichier Excel des refus
"""

import pandas as pd
import sys

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel: ")

print(f"\nAnalyse du fichier: {excel_file}\n")

# Lister toutes les feuilles
xl_file = pd.ExcelFile(excel_file)
print(f"📋 Feuilles disponibles: {xl_file.sheet_names}")

# Lire chaque feuille
for sheet_name in xl_file.sheet_names:
    print(f"\n{'='*60}")
    print(f"Feuille: {sheet_name}")
    print(f"{'='*60}")
    
    df = pd.read_excel(excel_file, sheet_name=sheet_name, header=None)
    print(f"Total lignes: {len(df)}")
    print(f"Total colonnes: {len(df.columns)}")
    
    # Afficher les 30 premières lignes pour trouver les en-têtes
    print(f"\n📄 Structure brute (30 premières lignes):")
    for i in range(min(30, len(df))):
        has_data = False
        line_data = []
        for j, val in enumerate(df.iloc[i]):
            if pd.notna(val):
                has_data = True
                line_data.append(f"Col {j}: {val}")
        if has_data:
            print(f"\nLigne {i + 1}:")
            for item in line_data:
                print(f"  {item}")
