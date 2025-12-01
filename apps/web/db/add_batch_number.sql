-- Add batch_number column to generated_comments table
ALTER TABLE generated_comments 
ADD COLUMN IF NOT EXISTS batch_number INTEGER NOT NULL DEFAULT 1;

-- Update existing rows to have batch_number = 1
UPDATE generated_comments 
SET batch_number = 1 
WHERE batch_number IS NULL;
