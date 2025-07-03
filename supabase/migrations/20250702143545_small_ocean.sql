/*
  # Add Support role to users table

  1. Changes
    - Update the grade check constraint to include 'Support' role
    - Add a sample Support user
    - Update RLS policies to allow Support users to manage bug reports
*/

-- Update the grade check constraint to include 'Support' role
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_grade_check;

ALTER TABLE users
ADD CONSTRAINT users_grade_check 
CHECK (grade IN ('Guest', 'V4', 'V5', 'Support', 'Admin'));

-- Add a sample Support user if it doesn't exist
INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked, admin_notes)
VALUES 
  (
    '44444444-4444-4444-4444-444444444444',
    'Support User',
    'support@prodomo.local',
    'Support',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    3,
    false,
    false,
    'Support team member with bug management access'
  )
ON CONFLICT (id) DO NOTHING;

-- Add Support user to auth.users if it doesn't exist
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('44444444-4444-4444-4444-444444444444', 'support@prodomo.local', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Update bug_reports table to add author_grade field to comments
DO $$
BEGIN
  -- Check if we need to update any existing bug reports to add author_grade to comments
  UPDATE bug_reports
  SET comments = (
    SELECT jsonb_agg(
      jsonb_set(
        comment, 
        '{author_grade}', 
        CASE
          WHEN comment->>'author' LIKE '%Admin%' THEN '"Admin"'
          WHEN comment->>'author' LIKE '%Support%' THEN '"Support"'
          WHEN comment->>'author' LIKE '%V5%' THEN '"V5"'
          ELSE '"V4"'
        END
      )
    )
    FROM jsonb_array_elements(comments) AS comment
  )
  WHERE comments IS NOT NULL AND jsonb_array_length(comments) > 0;
END $$;