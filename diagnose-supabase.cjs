// Script de diagnostic Supabase
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
const envContent = fs.readFileSync(envPath, 'utf8');

const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

console.log('🔍 Diagnostic Supabase\n');
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${supabaseKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  try {
    // Test 1: Connexion base de données
    console.log('1️⃣ Test connexion base de données...');
    const { data: animals, error: dbError } = await supabase
      .from('animals')
      .select('count', { count: 'exact', head: true });
    
    if (dbError) {
      console.log(`   ❌ Erreur DB: ${dbError.message}`);
    } else {
      console.log(`   ✅ DB OK - ${animals} animaux`);
    }

    // Test 2: Storage buckets
    console.log('\n2️⃣ Test Storage buckets...');
    const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
    
    if (storageError) {
      console.log(`   ❌ Erreur Storage: ${storageError.message}`);
      console.log(`   Code: ${storageError.code}`);
      console.log(`   Details: ${JSON.stringify(storageError.details)}`);
    } else {
      console.log(`   ✅ Storage OK - ${buckets.length} bucket(s)`);
      buckets.forEach(b => {
        console.log(`      - ${b.name} (public: ${b.public})`);
      });
    }

    // Test 3: Permissions Storage
    console.log('\n3️⃣ Test permissions Storage...');
    try {
      const { data: testFile, error: uploadError } = await supabase.storage
        .from('animals')
        .upload('test.txt', new Blob(['test']), { upsert: true });
      
      if (uploadError) {
        console.log(`   ❌ Upload refusé: ${uploadError.message}`);
      } else {
        console.log(`   ✅ Upload autorisé`);
        // Nettoyer
        await supabase.storage.from('animals').remove(['test.txt']);
      }
    } catch (e) {
      console.log(`   ❌ Erreur upload: ${e.message}`);
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error.message);
  }
}

diagnose();
