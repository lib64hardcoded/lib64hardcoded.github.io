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

-- Update bug_reports table to add author_grade field to comments using a different approach
DO $$
DECLARE
  report_record RECORD;
  updated_comments JSONB;
  comment_item JSONB;
  i INTEGER;
BEGIN
  -- Loop through each bug report with comments
  FOR report_record IN 
    SELECT id, comments FROM bug_reports 
    WHERE comments IS NOT NULL AND jsonb_array_length(comments) > 0
  LOOP
    updated_comments := '[]'::jsonb;
    
    -- Process each comment in the array
    FOR i IN 0..jsonb_array_length(report_record.comments)-1 LOOP
      comment_item := report_record.comments->i;
      
      -- Add author_grade field based on author name
      IF comment_item->>'author' LIKE '%Admin%' THEN
        comment_item := jsonb_build_object(
          'id', comment_item->>'id',
          'author', comment_item->>'author',
          'author_grade', 'Admin',
          'content', comment_item->>'content',
          'created_at', comment_item->>'created_at'
        );
      ELSIF comment_item->>'author' LIKE '%Support%' THEN
        comment_item := jsonb_build_object(
          'id', comment_item->>'id',
          'author', comment_item->>'author',
          'author_grade', 'Support',
          'content', comment_item->>'content',
          'created_at', comment_item->>'created_at'
        );
      ELSIF comment_item->>'author' LIKE '%V5%' THEN
        comment_item := jsonb_build_object(
          'id', comment_item->>'id',
          'author', comment_item->>'author',
          'author_grade', 'V5',
          'content', comment_item->>'content',
          'created_at', comment_item->>'created_at'
        );
      ELSE
        comment_item := jsonb_build_object(
          'id', comment_item->>'id',
          'author', comment_item->>'author',
          'author_grade', 'V4',
          'content', comment_item->>'content',
          'created_at', comment_item->>'created_at'
        );
      END IF;
      
      -- Add to the updated comments array
      updated_comments := updated_comments || comment_item;
    END LOOP;
    
    -- Update the bug report with the modified comments
    UPDATE bug_reports SET comments = updated_comments WHERE id = report_record.id;
  END LOOP;
END $$;