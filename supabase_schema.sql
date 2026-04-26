<<<<<<< HEAD
-- SQL Script to set up Supabase schema for CHRS Planning App

-- 1. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  working_hours_percentage FLOAT DEFAULT 100,
  initials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  schedule_type TEXT NOT NULL, -- 'general', 'cuisinier', 'veilleur', 'astreinte'
  primary_shift_id TEXT,
  overlays JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date, schedule_type)
);

-- 3. Notes table (if needed for later)
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  context TEXT NOT NULL, -- 'general', 'cuisinier', 'veilleur', 'astreinte'
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, context)
);

-- Optional: Enable Row Level Security (RLS)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (adjust as needed for security)
-- CREATE POLICY "Allow anonymous read" ON employees FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON employees FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON employees FOR UPDATE USING (true);
-- ... same for other tables
=======
-- SQL Script to set up Supabase schema for CHRS Planning App

-- 1. Employees table
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  color TEXT,
  working_hours_percentage FLOAT DEFAULT 100,
  initials TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  schedule_type TEXT NOT NULL, -- 'general', 'cuisinier', 'veilleur', 'astreinte'
  primary_shift_id TEXT,
  overlays JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(employee_id, date, schedule_type)
);

-- 3. Notes table (if needed for later)
CREATE TABLE IF NOT EXISTS notes (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL,
  context TEXT NOT NULL, -- 'general', 'cuisinier', 'veilleur', 'astreinte'
  content TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, context)
);

-- Optional: Enable Row Level Security (RLS)
-- ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Create policies for anonymous access (adjust as needed for security)
-- CREATE POLICY "Allow anonymous read" ON employees FOR SELECT USING (true);
-- CREATE POLICY "Allow anonymous insert" ON employees FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Allow anonymous update" ON employees FOR UPDATE USING (true);
-- ... same for other tables
>>>>>>> 576f8dba72b87aa5084dbd6c5cd7ffe1b1458e38
