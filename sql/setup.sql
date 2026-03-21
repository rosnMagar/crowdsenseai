-- CrowdSenseAI Database Setup
-- Run this in Supabase SQL Editor

-- 1. Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Grant necessary permissions for pg_cron
GRANT USAGE ON SCHEMA cron TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cron TO postgres;

-- 3. Create tables for AI features (if not already created)
-- Note: Only run if tables don't exist yet

CREATE TABLE IF NOT EXISTS quadrant_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadrant_id TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  density INTEGER DEFAULT 0 CHECK (density >= 0 AND density <= 3),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  session_id UUID,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_prediction BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS ai_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'crowdsense_model',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  weights JSONB NOT NULL DEFAULT '[]',
  layer_config JSONB NOT NULL DEFAULT '{}',
  accuracy_score NUMERIC,
  training_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false
);

CREATE TABLE IF NOT EXISTS daily_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  quadrant_id TEXT NOT NULL,
  predicted_density JSONB NOT NULL,
  actual_density INTEGER,
  error_score NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_quadrant_data_quadrant ON quadrant_data(quadrant_id);
CREATE INDEX IF NOT EXISTS idx_quadrant_data_time ON quadrant_data(hour_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_quadrant_data_session ON quadrant_data(session_id);
CREATE INDEX IF NOT EXISTS idx_quadrant_data_timestamp ON quadrant_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_ai_weights_active ON ai_weights(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_daily_comparisons_date ON daily_comparisons(date);
CREATE INDEX IF NOT EXISTS idx_daily_comparisons_quadrant ON daily_comparisons(quadrant_id);

-- 5. Insert initial empty model if not exists
INSERT INTO ai_weights (name, weights, layer_config, is_active)
SELECT 'crowdsense_model', '[]'::jsonb, '{"inputSize": 121, "hiddenSizes": [64, 32], "outputSize": 96}'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM ai_weights WHERE is_active = true);

-- 6. Clear any duplicate active models
UPDATE ai_weights SET is_active = false 
WHERE id NOT IN (SELECT id FROM ai_weights WHERE is_active = true ORDER BY updated_at DESC LIMIT 1);

-- 7. Verify setup
DO $$
BEGIN
  RAISE NOTICE 'Database setup complete!';
  RAISE NOTICE 'Tables: quadrant_data, ai_weights, daily_comparisons';
  RAISE NOTICE 'pg_cron enabled for scheduled training';
END $$;
