// Script de test pour vérifier la connexion Supabase
// Exécutez avec: node test-db.js

const { createClient } = require('@supabase/supabase-js');

// Charger les variables d'environnement
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  console.log('Vérifiez que le fichier .env contient VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('🔍 Test de connexion à Supabase...\n');
  console.log(`URL: ${supabaseUrl}`);
  console.log(`Key: ${supabaseKey.substring(0, 20)}...\n`);

  try {
    // Test 1: Vérifier la connexion avec une requête simple
    console.log('1️⃣ Test de connexion...');
    const { data, error } = await supabase.from('animals').select('count', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Erreur de connexion:', error.message);
      return false;
    }
    console.log('✅ Connexion réussie!');
    console.log(`   Nombre d'animaux dans la base: ${data}\n`);

    // Test 2: Vérifier les tables principales
    console.log('2️⃣ Vérification des tables principales...');
    const tables = [
      'animals',
      'famille_accueils',
      'veterinaires',
      'pensions',
      'signalements',
      'adoptions',
      'justice_cases',
      'alerts'
    ];

    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}: ${count} enregistrements`);
      }
    }
    console.log();

    // Test 3: Vérifier le bucket Storage
    console.log('3️⃣ Vérification du bucket Storage...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.log(`   ❌ Erreur Storage: ${bucketError.message}`);
    } else {
      const animalsBucket = buckets.find(b => b.name === 'animals');
      if (animalsBucket) {
        console.log(`   ✅ Bucket 'animals' existe (public: ${animalsBucket.public})`);
      } else {
        console.log(`   ⚠️  Bucket 'animals' manquant - créez-le dans Supabase Storage`);
      }
    }
    console.log();

    console.log('✅ Tous les tests terminés avec succès!');
    return true;

  } catch (error) {
    console.error('❌ Erreur inattendue:', error.message);
    return false;
  }
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
