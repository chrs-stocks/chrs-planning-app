<<<<<<< HEAD
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL ou Key manquante. Vérifiez votre fichier .env");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
=======
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Supabase URL ou Key manquante. Vérifiez votre fichier .env");
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');
>>>>>>> 576f8dba72b87aa5084dbd6c5cd7ffe1b1458e38
