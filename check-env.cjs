// Script pour vérifier les variables d'environnement
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env');

console.log('🔍 Vérification des variables d\'environnement...\n');

// Vérifier si le fichier .env existe
if (!fs.existsSync(envPath)) {
  console.log('❌ Le fichier .env n\'existe pas');
  console.log(`   Chemin attendu: ${envPath}`);
  process.exit(1);
}

console.log('✅ Le fichier .env existe');

// Lire et afficher le contenu
const envContent = fs.readFileSync(envPath, 'utf8');
console.log('\n📄 Contenu du fichier .env:');
console.log(envContent);

// Extraire les variables
const supabaseUrl = envContent.match(/VITE_SUPABASE_URL=(.+)/)?.[1]?.trim();
const supabaseKey = envContent.match(/VITE_SUPABASE_ANON_KEY=(.+)/)?.[1]?.trim();

console.log('\n🔑 Variables extraites:');
console.log(`   VITE_SUPABASE_URL: ${supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : '❌ Non trouvée'}`);
console.log(`   VITE_SUPABASE_ANON_KEY: ${supabaseKey ? supabaseKey.substring(0, 20) + '...' : '❌ Non trouvée'}`);

if (!supabaseUrl || !supabaseKey) {
  console.log('\n❌ Variables d\'environnement manquantes ou incorrectes');
  process.exit(1);
}

console.log('\n✅ Variables d\'environnement OK');
