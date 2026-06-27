/**
 * Script de création des comptes utilisateurs Supabase
 * Exécution : node create-users.mjs
 *
 * ⚠️  Remplacez SERVICE_ROLE_KEY par votre clé depuis :
 *     Supabase Dashboard → Settings → API → service_role (secret)
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nadcnrhytyiphkqmgbrc.supabase.co';
const SERVICE_ROLE_KEY = 'REMPLACEZ_PAR_VOTRE_SERVICE_ROLE_KEY';

// Connexion par Magic Link uniquement — aucun mot de passe à communiquer

const users = [
  // ── Administration logiciel ────────────────────────────────
  { email: 'jansi.dhenry@gmail.com',                    name: 'Admin',           role: 'admin'    },

  // ── Direction (admin) ──────────────────────────────────────
  { email: 'cse@maison-saint-martin.fr',                name: 'Aurore GIBIER',   role: 'admin'    },
  { email: 'educ1@maison-saint-martin.fr',              name: 'Jansi',           role: 'employee' },

  // ── Équipe générale ────────────────────────────────────────
  { email: 'josselin.vallee-jeanne@maison-saint-martin.fr', name: 'Josselin',   role: 'employee' },
  { email: 'educ@maison-saint-martin.fr',               name: 'Astrid',          role: 'employee' },
  { email: 'chrs@maison-saint-martin.fr',               name: 'Florence',        role: 'employee' },
  { email: 'economat@maison-saint-martin.fr',           name: 'Dorine',          role: 'employee' },

  // ── Postes partagés ───────────────────────────────────────
  { email: 'chrsmaisonsaintmartin@gmail.com',           name: 'Stagiaire',       role: 'employee' },
  { email: 'chrsendiffus@maison-saint-martin.fr',       name: 'Renfort',         role: 'employee' },

  // ── Veilleurs ─────────────────────────────────────────────
  { email: 'veilleur2msm@gmail.com',                    name: 'Dominique Allard', role: 'employee' },
  { email: 'veilleursmsm@gmail.com',                    name: 'Kévin Mariette',  role: 'employee' },
];

// ─────────────────────────────────────────────────────────────

if (SERVICE_ROLE_KEY === 'REMPLACEZ_PAR_VOTRE_SERVICE_ROLE_KEY') {
  console.error('❌  Vous devez renseigner votre SERVICE_ROLE_KEY dans ce fichier avant de lancer le script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUsers() {
  console.log(`\n🚀  Création de ${users.length} comptes...\n`);

  for (const u of users) {
    process.stdout.write(`  ${u.name.padEnd(20)} (${u.email}) ... `);

    // Créer le compte (sans mot de passe — connexion par Magic Link uniquement)
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email: u.email,
      email_confirm: true, // compte actif immédiatement
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log('⚠️  existe déjà, mise à jour du profil...');
        // Récupère l'id existant pour mettre à jour le profil quand même
        const { data: existingUsers } = await supabase.auth.admin.listUsers();
        const existing = existingUsers?.users?.find(eu => eu.email === u.email);
        if (existing) {
          await supabase.from('profiles').upsert({ id: existing.id, name: u.name, role: u.role });
        }
      } else {
        console.log(`❌  ${authError.message}`);
      }
      continue;
    }

    // 2. Créer le profil
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({ id: data.user.id, name: u.name, role: u.role, email: u.email });

    if (profileError) {
      console.log(`✅  compte créé / ❌  profil : ${profileError.message}`);
    } else {
      console.log(`✅  OK`);
    }

    // Petite pause pour éviter les rate limits Supabase
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n✅  Terminé !`);
  console.log('\nLes employés se connectent via leur email — un lien leur est envoyé à chaque connexion.');
  console.log('Aucun mot de passe à communiquer.\n');
}

createUsers().catch(console.error);
