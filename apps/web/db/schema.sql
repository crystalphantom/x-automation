-- Twitter Comment Agent Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Posts table
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  author TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Generated comments table
CREATE TABLE generated_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  variant_number INT NOT NULL,
  comment_text TEXT NOT NULL,
  style TEXT,
  word_count INT,
  quality_score FLOAT,
  relevance_score FLOAT,
  safety_score FLOAT,
  engagement_score FLOAT,
  recommendation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT TRUE,
  tone_profile TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Processing history (optional, for tracking)
CREATE TABLE processing_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id TEXT REFERENCES posts(id) ON DELETE CASCADE,
  should_comment BOOLEAN,
  confidence FLOAT,
  selected_tone TEXT,
  risk_level TEXT,
  reasoning TEXT,
  processed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_comments_post_id ON generated_comments(post_id);
CREATE INDEX idx_comments_quality ON generated_comments(quality_score DESC);
CREATE INDEX idx_preferences_category ON user_preferences(category);

-- Insert default user preferences
INSERT INTO user_preferences (category, is_enabled, tone_profile) VALUES
  ('technology', true, 'professional_insightful'),
  ('startups', true, 'friendly_supportive'),
  ('product_management', true, 'analytical_question_driven'),
  ('general', false, 'casual_authentic')
ON CONFLICT (category) DO NOTHING;
