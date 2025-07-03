/*
  # Fix infinite recursion in users table RLS policy

  1. Problem
    - The "Admins can view all users" policy causes infinite recursion
    - Policy tries to query users table from within users table policy
    - This creates a loop that prevents any data retrieval

  2. Solution
    - Create a security definer function to check admin status
    - Function executes with elevated privileges, bypassing RLS
    - Update the policy to use this function instead of direct table query

  3. Changes
    - Add `is_admin_user()` function with SECURITY DEFINER
    - Update "Admins can view all users" policy
    - Update "Admins can update users" policy
*/

-- Create a security definer function to check if current user is admin
-- This function runs with elevated privileges and bypasses RLS
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid() AND grade = 'Admin'
  );
$$;

-- Drop the existing problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Recreate the policies using the security definer function
CREATE POLICY "Admins can view all users" ON users
    FOR SELECT USING (is_admin_user());

CREATE POLICY "Admins can update users" ON users
    FOR UPDATE USING (is_admin_user());