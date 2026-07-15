"""
Script pour analyser la structure du fichier Excel
"""

import pandas as pd
import sys

excel_file = sys.argv[1] if len(sys.argv) > 1 else input("Entrez le chemin du fichier Excel: ")

print(f"\nAnalyse du fichier: {excel_file}\n")

# L'en-tête est sur la ligne 4 (index 3)
df = pd.read_excel(excel_file, header=3)

print(f"Nombre de lignes: {len(df)}")
print(f"Nombre de colonnes: {len(df.columns)}")
print(f"\nColonnes trouvées ({len(df.columns)}):")
for i, col in enumerate(df.columns, 1):
    print(f"  {i}. '{col}'")

print(f"\nPremières lignes (5 premières):")
print(df.head().to_string())

print(f"\nTypes de données:")
print(df.dtypes)
