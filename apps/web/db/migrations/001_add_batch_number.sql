-- Migration: Add batch_number column to generated_comments
-- Run this in Supabase SQL Editor (SQL Editor > New Query)

BEGIN;

-- Add the column with default value
ALTER TABLE generated_comments 
ADD COLUMN IF NOT EXISTS batch_number INTEGER DEFAULT 1;

-- Set batch_number = 1 for all existing rows
UPDATE generated_comments 
SET batch_number = 1 
WHERE batch_number IS NULL;

-- Optional: Add a comment to document the column
COMMENT ON COLUMN generated_comments.batch_number IS 'Tracks regeneration batches - increments with each regenerate action';

COMMIT;

-- Verify the migration
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'generated_comments' 
AND column_name = 'batch_number';

-- Check existing data
SELECT 
  post_id,
  batch_number,
  variant_number,
  LEFT(comment_text, 30) as preview,
  created_at
FROM generated_comments
ORDER BY post_id, created_at
LIMIT 20;
