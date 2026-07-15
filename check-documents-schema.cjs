// Diagnostic du stockage des documents (table `documents` + bucket Storage).
// Usage: node check-documents-schema.cjs   (nécessite un .env avec VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');
if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env introuvable. Copiez .env.example vers .env et renseignez vos clés.');
  process.exit(1);
}
const envContent = fs.readFileSync(envPath, 'utf8');
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

const supabase = createClient(supabaseUrl, supabaseKey);

// Colonnes attendues par l'application React.
const EXPECTED = [
  'id', 'animal_id', 'module', 'module_id', 'type_document',
  'nom_fichier', 'url', 'storage_path', 'description', 'folder', 'taille',
  'created_by', 'created_at',
];

// Colonnes de l'ancien schéma: leur présence signale une base non migrée.
const LEGACY = ['titre', 'fichier_url', 'type', 'date_document'];

const BUCKET = 'documents';

async function main() {
  console.log('🔍 Diagnostic du stockage des documents\n');

  // --- 1. Schéma de la table ---------------------------------------------
  // Une colonne inexistante fait échouer le select -> test colonne par colonne.
  const present = [];
  const missing = [];
  for (const col of EXPECTED) {
    const { error } = await supabase.from('documents').select(col).limit(1);
    if (error) missing.push(col);
    else present.push(col);
  }

  console.log('📋 Colonnes de la table `documents`:');
  for (const col of EXPECTED) {
    console.log(`  ${present.includes(col) ? '✅' : '❌ MANQUANTE →'} ${col}`);
  }

  const legacyPresent = [];
  for (const col of LEGACY) {
    const { error } = await supabase.from('documents').select(col).limit(1);
    if (!error) legacyPresent.push(col);
  }
  if (legacyPresent.length) {
    console.log(`\n⚠️  Colonnes de l'ancien schéma encore présentes: ${legacyPresent.join(', ')}`);
  }

  if (missing.length) {
    console.log(`\n❌ ${missing.length} colonne(s) manquante(s): ${missing.join(', ')}`);
    console.log('   → Appliquez les migrations 20260715100000 et 20260715120000.');
  } else {
    console.log('\n✅ Le schéma correspond à ce qu\'attend l\'application.');
  }

  // --- 2. Bucket Storage --------------------------------------------------
  console.log(`\n📦 Bucket « ${BUCKET} »:`);
  // Détecter l'existence d'un bucket est piégeux avec la clé anon:
  //   - listBuckets() renvoie 0 bucket (droit réservé aux requêtes authentifiées);
  //   - from(bucket).list() répond OK même pour un bucket inexistant;
  //   - createSignedUrl() répond « Object not found » dans tous les cas.
  // Seule une écriture réelle distingue les cas. Si le bucket est absent, rien
  // n'est écrit; s'il existe, on nettoie la sonde juste après.
  const probePath = `__diagnostic__/${Date.now()}.txt`;
  const { error: upError } = await supabase.storage
    .from(BUCKET)
    .upload(probePath, Buffer.from('sonde'), { contentType: 'text/plain' });

  if (!upError) {
    console.log('  ✅ Existe, et l\'écriture fonctionne.');
    await supabase.storage.from(BUCKET).remove([probePath]);
  } else if (/Bucket not found/i.test(upError.message)) {
    console.log('  ❌ Introuvable → appliquez 20260715120000_documents_storage_bucket.sql');
  } else {
    // Une erreur d'autorisation prouve que le bucket existe: la requête a été
    // évaluée par les policies au lieu d'être rejetée d'emblée.
    console.log(`  ✅ Existe (écriture refusée: ${upError.message})`);
    console.log('     Normal avec la clé anon non authentifiée: le bucket est privé.');
  }

  // --- 3. Test d'écriture -------------------------------------------------
  console.log('\n🧪 Test d\'insertion (avec `folder` et `storage_path`)...');
  const { data, error } = await supabase
    .from('documents')
    .insert({
      module: 'animal',
      type_document: 'autre',
      nom_fichier: '__diagnostic_test__.pdf',
      storage_path: 'divers/__diagnostic_test__.pdf',
      folder: 'Général',
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.log(`❌ Insertion refusée: [${error.code}] ${error.message}`);
    if (error.code === 'PGRST204') {
      console.log('   → Colonne absente en base: les migrations ne sont pas appliquées.');
    } else if (error.code === '42501' || /row-level security/i.test(error.message)) {
      console.log('   → RLS: la clé anon n\'est pas authentifiée. Testez plutôt depuis l\'application connectée.');
    } else if (error.code === '23514') {
      console.log('   → Contrainte CHECK violée (documents_source_check ?).');
    }
  } else {
    console.log('✅ Insertion réussie — la sauvegarde des documents fonctionne.');
    if (data?.id) {
      await supabase.from('documents').delete().eq('id', data.id);
      console.log('🧹 Ligne de test supprimée.');
    }
  }
}

main();
