-- CrowdSenseAI AI Tables
-- Run this in Supabase SQL Editor

-- Quadrant observations (raw data)
CREATE TABLE quadrant_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quadrant_id TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  density INTEGER DEFAULT 0 CHECK (density >= 0 AND density <= 3),
  hour_of_day INTEGER NOT NULL CHECK (hour_of_day >= 0 AND hour_of_day <= 23),
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  is_prediction BOOLEAN DEFAULT false
);

CREATE INDEX idx_quadrant_data_quadrant ON quadrant_data(quadrant_id);
CREATE INDEX idx_quadrant_data_time ON quadrant_data(hour_of_day, day_of_week);
CREATE INDEX idx_quadrant_data_session ON quadrant_data(session_id);
CREATE INDEX idx_quadrant_data_timestamp ON quadrant_data(timestamp);

-- AI model weights (neural network)
CREATE TABLE ai_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'crowdsense_model',
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  weights JSONB NOT NULL,
  layer_config JSONB NOT NULL,
  accuracy_score NUMERIC,
  training_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT false
);

CREATE INDEX idx_ai_weights_active ON ai_weights(is_active) WHERE is_active = true;

-- Daily predictions vs actual comparisons (RL feedback)
CREATE TABLE daily_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  quadrant_id TEXT NOT NULL,
  predicted_density JSONB NOT NULL,
  actual_density INTEGER,
  error_score NUMERIC,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_daily_comparisons_date ON daily_comparisons(date);
CREATE INDEX idx_daily_comparisons_quadrant ON daily_comparisons(quadrant_id);

-- Insert initial empty model
INSERT INTO ai_weights (weights, layer_config, is_active)
VALUES (
  '[]'::jsonb,
  '{"inputSize": 96, "hiddenSizes": [64, 32], "outputSize": 1152}'::jsonb,
  true
);
