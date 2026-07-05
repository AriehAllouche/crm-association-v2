// Script pour vérifier les buckets Supabase Storage
// Exécutez avec: node check-buckets.cjs

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Lire le fichier .env manuellement
const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erreur: Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuckets() {
  console.log('🔍 Vérification des buckets Supabase Storage...\n');

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Erreur lors de la récupération des buckets:', error.message);
      return;
    }

    console.log(`📦 Nombre total de buckets: ${buckets.length}\n`);

    if (buckets.length === 0) {
      console.log('⚠️  Aucun bucket trouvé. Vous devez créer les buckets manuellement:');
      console.log('   1. Allez sur https://supabase.com/dashboard');
      console.log('   2. Sélectionnez votre projet');
      console.log('   3. Cliquez sur "Storage" → "New bucket"');
      console.log('   4. Créez un bucket nommé "animals" (cochez "Public bucket")');
      console.log('   5. Configurez les politiques RLS (voir instructions)');
      return;
    }

    buckets.forEach(bucket => {
      console.log(`📦 ${bucket.name}`);
      console.log(`   Public: ${bucket.public ? '✅ Oui' : '❌ Non'}`);
      console.log(`   ID: ${bucket.id}`);
      console.log();
    });

    const animalsBucket = buckets.find(b => b.name === 'animals');
    if (!animalsBucket) {
      console.log('❌ Bucket "animals" manquant!');
      console.log('   Créez-le dans Supabase Storage avec les options suivantes:');
      console.log('   - Nom: animals');
      console.log('   - Public bucket: ✅ Coché');
      console.log('   - File size limit: 5MB');
    } else if (!animalsBucket.public) {
      console.log('⚠️  Bucket "animals" existe mais n\'est pas public!');
      console.log('   Les images ne seront pas accessibles publiquement.');
      console.log('   Modifiez le bucket pour le rendre public.');
    } else {
      console.log('✅ Bucket "animals" est correctement configuré!');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

checkBuckets();
