// Script pour vérifier les tables Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

console.log('🔍 Vérification des tables Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

const requiredTables = [
  'animals',
  'contacts',
  'famille_accueils',
  'famille_accueil_animaux',
  'veterinaires',
  'veterinaire_visites',
  'pensions',
  'pension_sejours',
  'signalements',
  'adoptions',
  'justice_cases',
  'transports',
  'documents',
  'depenses',
  'enqueteurs',
  'registre_entree_sortie',
  'alerts',
  'profiles'
];

async function checkTables() {
  console.log('📋 Tables requises:\n');

  for (const table of requiredTables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: ${count} enregistrements`);
      }
    } catch (e) {
      console.log(`❌ ${table}: Erreur inattendue`);
    }
  }

  console.log('\n📝 Résumé:');
  console.log('Si des tables sont manquantes, vous devez les créer dans Supabase.');
  console.log('Vous pouvez utiliser le dossier "supabase" du projet pour les migrations SQL.');
}
