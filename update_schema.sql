-- Script SQL à exécuter dans Supabase pour mettre à jour votre table schedules

-- 1. Ajout des colonnes manquantes à la table schedules
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'general';
ALTER TABLE schedules ADD COLUMN IF NOT EXISTS overlays JSONB DEFAULT '[]'::jsonb;

-- 2. Mise à jour de la contrainte d'unicité pour inclure le type de planning
-- On supprime l'ancienne contrainte (le nom peut varier, souvent 'schedules_employee_id_date_key')
ALTER TABLE schedules DROP CONSTRAINT IF EXISTS schedules_employee_id_date_key;
ALTER TABLE schedules ADD CONSTRAINT schedules_employee_id_date_type_unique UNIQUE(employee_id, date, schedule_type);

-- 3. Mise à jour de la table profiles pour correspondre aux besoins de l'app
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS working_hours_percentage FLOAT DEFAULT 100;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS initials TEXT;

-- 4. (Optionnel) Table des employés si vous préférez séparer les profils utilisateurs (auth)
-- des employés affichés dans le planning (qui n'ont pas forcément de compte)
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  working_hours_percentage FLOAT DEFAULT 100,
  initials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
