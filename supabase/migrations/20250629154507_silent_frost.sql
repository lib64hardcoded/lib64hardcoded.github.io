/*
  # Create demo users for authentication

  1. New Data
    - Insert demo users (admin, v4, v5) into the users table
    - These users are needed for the authentication system to work properly
  
  2. Security
    - Users are created with appropriate grades and permissions
    - Admin user has full access, V4 and V5 users have limited access
*/

-- Insert demo users if they don't already exist
INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Admin User',
    'admin@prodomo.local',
    'Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0,
    false,
    false
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'V4 User',
    'v4@prodomo.local',
    'V4',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0,
    false,
    false
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'V5 User',
    'v5@prodomo.local',
    'V5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0,
    false,
    false
  )
ON CONFLICT (email) DO NOTHING;