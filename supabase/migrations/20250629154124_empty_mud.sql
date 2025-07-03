-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users 
    WHERE id = auth.uid() AND grade = 'Admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to get current user ID
CREATE OR REPLACE FUNCTION uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  email text UNIQUE NOT NULL,
  grade text DEFAULT 'V4' CHECK (grade IN ('Guest', 'V4', 'V5', 'Admin')),
  join_date timestamptz DEFAULT CURRENT_TIMESTAMP,
  last_active timestamptz DEFAULT CURRENT_TIMESTAMP,
  total_downloads integer DEFAULT 0,
  is_guest boolean DEFAULT false,
  guest_expires_at timestamptz,
  is_blocked boolean DEFAULT false,
  blocked_until timestamptz,
  admin_notes text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'users' AND rowsecurity = true
  ) THEN
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Only create policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Users can view their own data'
  ) THEN
    CREATE POLICY "Users can view their own data"
      ON users FOR SELECT
      TO public
      USING (uid() = id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins can view all users'
  ) THEN
    CREATE POLICY "Admins can view all users"
      ON users FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'Admins can update users'
  ) THEN
    CREATE POLICY "Admins can update users"
      ON users FOR UPDATE
      TO public
      USING (is_admin_user());
  END IF;
END $$;

-- Server files table
CREATE TABLE IF NOT EXISTS server_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  version text NOT NULL,
  description text,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  file_type text DEFAULT 'server' CHECK (file_type IN ('server', 'plugin', 'archive', 'documentation')),
  min_grade text DEFAULT 'V4' CHECK (min_grade IN ('Guest', 'V4', 'V5', 'Admin')),
  status text DEFAULT 'active' CHECK (status IN ('active', 'deprecated', 'beta')),
  download_count integer DEFAULT 0,
  changelog jsonb DEFAULT '[]',
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'server_files' AND rowsecurity = true
  ) THEN
    ALTER TABLE server_files ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Server files policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'server_files' AND policyname = 'Anyone can view server files'
  ) THEN
    CREATE POLICY "Anyone can view server files"
      ON server_files FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'server_files' AND policyname = 'Admins can insert server files'
  ) THEN
    CREATE POLICY "Admins can insert server files"
      ON server_files FOR INSERT
      TO public
      WITH CHECK (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'server_files' AND policyname = 'Admins can update server files'
  ) THEN
    CREATE POLICY "Admins can update server files"
      ON server_files FOR UPDATE
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'server_files' AND policyname = 'Admins can delete server files'
  ) THEN
    CREATE POLICY "Admins can delete server files"
      ON server_files FOR DELETE
      TO public
      USING (is_admin_user());
  END IF;
END $$;

-- Patch notes table
CREATE TABLE IF NOT EXISTS patch_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  version text NOT NULL,
  title text NOT NULL,
  content text,
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND rowsecurity = true
  ) THEN
    ALTER TABLE patch_notes ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Patch notes policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND policyname = 'Anyone can view published patch notes'
  ) THEN
    CREATE POLICY "Anyone can view published patch notes"
      ON patch_notes FOR SELECT
      TO public
      USING (status = 'published');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND policyname = 'Admins can view all patch notes'
  ) THEN
    CREATE POLICY "Admins can view all patch notes"
      ON patch_notes FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND policyname = 'Admins can insert patch notes'
  ) THEN
    CREATE POLICY "Admins can insert patch notes"
      ON patch_notes FOR INSERT
      TO public
      WITH CHECK (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND policyname = 'Admins can update patch notes'
  ) THEN
    CREATE POLICY "Admins can update patch notes"
      ON patch_notes FOR UPDATE
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'patch_notes' AND policyname = 'Admins can delete patch notes'
  ) THEN
    CREATE POLICY "Admins can delete patch notes"
      ON patch_notes FOR DELETE
      TO public
      USING (is_admin_user());
  END IF;
END $$;

-- Download logs table
CREATE TABLE IF NOT EXISTS download_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_name text,
  file_id uuid REFERENCES server_files(id) ON DELETE CASCADE,
  file_name text,
  file_version text,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'download_logs' AND rowsecurity = true
  ) THEN
    ALTER TABLE download_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Download logs policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'download_logs' AND policyname = 'Users can view their own download logs'
  ) THEN
    CREATE POLICY "Users can view their own download logs"
      ON download_logs FOR SELECT
      TO public
      USING (uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'download_logs' AND policyname = 'Admins can view all download logs'
  ) THEN
    CREATE POLICY "Admins can view all download logs"
      ON download_logs FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'download_logs' AND policyname = 'Users can insert their own download logs'
  ) THEN
    CREATE POLICY "Users can insert their own download logs"
      ON download_logs FOR INSERT
      TO public
      WITH CHECK (uid() = user_id);
  END IF;
END $$;

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  user_name text,
  action text NOT NULL,
  details text,
  ip_address text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND rowsecurity = true
  ) THEN
    ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Activity logs policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Users can view their own activity logs'
  ) THEN
    CREATE POLICY "Users can view their own activity logs"
      ON activity_logs FOR SELECT
      TO public
      USING (uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Admins can view all activity logs'
  ) THEN
    CREATE POLICY "Admins can view all activity logs"
      ON activity_logs FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'activity_logs' AND policyname = 'Users can insert their own activity logs'
  ) THEN
    CREATE POLICY "Users can insert their own activity logs"
      ON activity_logs FOR INSERT
      TO public
      WITH CHECK (uid() = user_id);
  END IF;
END $$;

-- System metrics table
CREATE TABLE IF NOT EXISTS system_metrics (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_type text NOT NULL CHECK (metric_type IN ('downloads', 'users', 'storage', 'bandwidth')),
  value numeric(15,2) NOT NULL,
  date date NOT NULL,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'system_metrics' AND rowsecurity = true
  ) THEN
    ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- System metrics policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'system_metrics' AND policyname = 'Anyone can view system metrics'
  ) THEN
    CREATE POLICY "Anyone can view system metrics"
      ON system_metrics FOR SELECT
      TO public
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'system_metrics' AND policyname = 'Admins can insert system metrics'
  ) THEN
    CREATE POLICY "Admins can insert system metrics"
      ON system_metrics FOR INSERT
      TO public
      WITH CHECK (is_admin_user());
  END IF;
END $$;

-- Documentation table
CREATE TABLE IF NOT EXISTS documentation (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content text,
  category text DEFAULT 'info' CHECK (category IN ('info', 'pricing', 'about', 'tos', 'changelog', 'partners', 'features', 'installation', 'api', 'troubleshooting')),
  version_type text DEFAULT 'general' CHECK (version_type IN ('v4', 'v5', 'general')),
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  order_index integer DEFAULT 0,
  meta_description text,
  tags jsonb DEFAULT '[]',
  images jsonb DEFAULT '[]',
  author_id uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name text,
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND rowsecurity = true
  ) THEN
    ALTER TABLE documentation ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Documentation policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND policyname = 'Anyone can view published documentation'
  ) THEN
    CREATE POLICY "Anyone can view published documentation"
      ON documentation FOR SELECT
      TO public
      USING (status = 'published');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND policyname = 'Admins can view all documentation'
  ) THEN
    CREATE POLICY "Admins can view all documentation"
      ON documentation FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND policyname = 'Admins can insert documentation'
  ) THEN
    CREATE POLICY "Admins can insert documentation"
      ON documentation FOR INSERT
      TO public
      WITH CHECK (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND policyname = 'Admins can update documentation'
  ) THEN
    CREATE POLICY "Admins can update documentation"
      ON documentation FOR UPDATE
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documentation' AND policyname = 'Admins can delete documentation'
  ) THEN
    CREATE POLICY "Admins can delete documentation"
      ON documentation FOR DELETE
      TO public
      USING (is_admin_user());
  END IF;
END $$;

-- Bug reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  description text,
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  category text DEFAULT 'general' CHECK (category IN ('general', 'ui', 'performance', 'security', 'feature')),
  status text DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  reporter_id uuid REFERENCES users(id) ON DELETE SET NULL,
  reporter_name text,
  assignee_id uuid REFERENCES users(id) ON DELETE SET NULL,
  assignee_name text,
  steps jsonb DEFAULT '[]',
  expected_behavior text,
  actual_behavior text,
  environment jsonb DEFAULT '{}',
  attachments jsonb DEFAULT '[]',
  comments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Only create RLS if not already enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND rowsecurity = true
  ) THEN
    ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Bug reports policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Users can view their own bug reports'
  ) THEN
    CREATE POLICY "Users can view their own bug reports"
      ON bug_reports FOR SELECT
      TO public
      USING (uid() = reporter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Admins can view all bug reports'
  ) THEN
    CREATE POLICY "Admins can view all bug reports"
      ON bug_reports FOR SELECT
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Users can insert bug reports'
  ) THEN
    CREATE POLICY "Users can insert bug reports"
      ON bug_reports FOR INSERT
      TO public
      WITH CHECK (uid() = reporter_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Admins can update bug reports'
  ) THEN
    CREATE POLICY "Admins can update bug reports"
      ON bug_reports FOR UPDATE
      TO public
      USING (is_admin_user());
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'bug_reports' AND policyname = 'Admins can delete bug reports'
  ) THEN
    CREATE POLICY "Admins can delete bug reports"
      ON bug_reports FOR DELETE
      TO public
      USING (is_admin_user());
  END IF;
END $$;

-- Insert sample users if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@prodomo.local') THEN
    INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked) VALUES
      ('11111111-1111-1111-1111-111111111111', 'Admin User', 'admin@prodomo.local', 'Admin', NOW(), NOW(), 0, false, false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'v4@prodomo.local') THEN
    INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked) VALUES
      ('22222222-2222-2222-2222-222222222222', 'V4 User', 'v4@prodomo.local', 'V4', NOW(), NOW(), 0, false, false);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'v5@prodomo.local') THEN
    INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked) VALUES
      ('33333333-3333-3333-3333-333333333333', 'V5 User', 'v5@prodomo.local', 'V5', NOW(), NOW(), 0, false, false);
  END IF;
END $$;

-- Insert sample server files if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM server_files LIMIT 1) THEN
    INSERT INTO server_files (name, version, description, file_url, file_size, file_type, min_grade, status, download_count, created_by) VALUES
      ('Prodomo Server V4', '4.2.1', 'Latest stable V4 server build with enhanced performance and security features.', 'https://example.com/prodomo-v4-4.2.1.zip', 52428800, 'server', 'V4', 'active', 1247, '11111111-1111-1111-1111-111111111111'),
      ('Prodomo Server V5 Beta', '5.0.0-beta.3', 'Beta release of V5 with new architecture and improved scalability.', 'https://example.com/prodomo-v5-beta3.zip', 67108864, 'server', 'V5', 'beta', 89, '11111111-1111-1111-1111-111111111111'),
      ('Test Client', '1.0.0', 'Lightweight test client for server connectivity testing.', 'https://example.com/test-client.zip', 2097152, 'archive', 'Guest', 'active', 3421, '11111111-1111-1111-1111-111111111111'),
      ('Admin Tools Plugin', '2.1.0', 'Essential administrative tools and utilities plugin.', 'https://example.com/admin-tools.zip', 1048576, 'plugin', 'Admin', 'active', 156, '11111111-1111-1111-1111-111111111111');
  END IF;
END $$;

-- Insert sample patch notes if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM patch_notes LIMIT 1) THEN
    INSERT INTO patch_notes (version, title, content, status, author_id, author_name) VALUES
      ('4.2.1', 'Security Update & Performance Improvements', 
       E'## What''s New\n\n### Security Enhancements\n- Fixed critical authentication vulnerability\n- Improved session management\n- Enhanced input validation\n\n### Performance\n- 25% faster startup time\n- Reduced memory usage by 15%\n- Optimized database queries\n\n### Bug Fixes\n- Fixed connection timeout issues\n- Resolved memory leaks in long-running sessions\n- Fixed UI rendering glitches on mobile devices', 
       'published', '11111111-1111-1111-1111-111111111111', 'Admin User'),
      ('5.0.0-beta.3', 'V5 Beta Release - New Architecture', 
       E'## V5 Beta Release\n\n### Major Changes\n- Complete rewrite of core architecture\n- New plugin system with better compatibility\n- Modern web-based admin interface\n\n### Breaking Changes\n- V4 plugins are not compatible\n- Configuration file format has changed\n- Database schema updates required\n\n### Known Issues\n- Some features are still in development\n- Performance may vary in different environments\n- Documentation is incomplete', 
       'published', '11111111-1111-1111-1111-111111111111', 'Admin User');
  END IF;
END $$;

-- Insert sample documentation if none exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM documentation LIMIT 1) THEN
    INSERT INTO documentation (title, slug, content, category, version_type, status, order_index, author_id, author_name) VALUES
      ('Getting Started', 'getting-started', 
       E'# Getting Started with Prodomo Server\n\nWelcome to Prodomo Server! This guide will help you get up and running quickly.\n\n## System Requirements\n\n- Windows 10/11 or Linux (Ubuntu 18.04+)\n- 4GB RAM minimum (8GB recommended)\n- 10GB free disk space\n- Network connectivity\n\n## Installation\n\n1. Download the latest server package\n2. Extract to your desired location\n3. Run the installer as administrator\n4. Follow the setup wizard\n\n## First Steps\n\n1. Start the server service\n2. Access the web interface at http://localhost:8080\n3. Complete the initial configuration\n4. Create your first user account', 
       'installation', 'general', 'published', 1, '11111111-1111-1111-1111-111111111111', 'Admin User'),
      ('V4 Configuration Guide', 'v4-configuration', 
       E'# V4 Server Configuration\n\n## Configuration Files\n\nThe V4 server uses several configuration files:\n\n- `server.conf` - Main server settings\n- `database.conf` - Database connection settings\n- `security.conf` - Security and authentication settings\n\n## Basic Settings\n\n```ini\n[server]\nport=8080\nmax_connections=100\ndebug=false\n\n[database]\nhost=localhost\nport=5432\nname=prodomo\n```\n\n## Security Configuration\n\nAlways change default passwords and enable SSL in production environments.', 
       'installation', 'v4', 'published', 2, '11111111-1111-1111-1111-111111111111', 'Admin User');
  END IF;
END $$;

-- Insert sample system metrics if none exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM system_metrics LIMIT 1) THEN
    INSERT INTO system_metrics (metric_type, value, date) VALUES
      ('downloads', 1247, CURRENT_DATE - INTERVAL '7 days'),
      ('downloads', 1389, CURRENT_DATE - INTERVAL '6 days'),
      ('downloads', 1156, CURRENT_DATE - INTERVAL '5 days'),
      ('downloads', 1445, CURRENT_DATE - INTERVAL '4 days'),
      ('downloads', 1678, CURRENT_DATE - INTERVAL '3 days'),
      ('downloads', 1234, CURRENT_DATE - INTERVAL '2 days'),
      ('downloads', 1567, CURRENT_DATE - INTERVAL '1 day'),
      ('downloads', 1890, CURRENT_DATE),
      ('users', 45, CURRENT_DATE - INTERVAL '7 days'),
      ('users', 47, CURRENT_DATE - INTERVAL '6 days'),
      ('users', 46, CURRENT_DATE - INTERVAL '5 days'),
      ('users', 49, CURRENT_DATE - INTERVAL '4 days'),
      ('users', 52, CURRENT_DATE - INTERVAL '3 days'),
      ('users', 48, CURRENT_DATE - INTERVAL '2 days'),
      ('users', 51, CURRENT_DATE - INTERVAL '1 day'),
      ('users', 53, CURRENT_DATE);
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_grade ON users(grade);
CREATE INDEX IF NOT EXISTS idx_server_files_status ON server_files(status);
CREATE INDEX IF NOT EXISTS idx_server_files_min_grade ON server_files(min_grade);
CREATE INDEX IF NOT EXISTS idx_patch_notes_status ON patch_notes(status);
CREATE INDEX IF NOT EXISTS idx_download_logs_user_id ON download_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_file_id ON download_logs(file_id);
CREATE INDEX IF NOT EXISTS idx_download_logs_created_at ON download_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_date ON system_metrics(date);
CREATE INDEX IF NOT EXISTS idx_system_metrics_type ON system_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_documentation_slug ON documentation(slug);
CREATE INDEX IF NOT EXISTS idx_documentation_status ON documentation(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_status ON bug_reports(status);
CREATE INDEX IF NOT EXISTS idx_bug_reports_reporter_id ON bug_reports(reporter_id);

-- Update the updated_at column automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
        CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_server_files_updated_at') THEN
        CREATE TRIGGER update_server_files_updated_at BEFORE UPDATE ON server_files FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_patch_notes_updated_at') THEN
        CREATE TRIGGER update_patch_notes_updated_at BEFORE UPDATE ON patch_notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_documentation_updated_at') THEN
        CREATE TRIGGER update_documentation_updated_at BEFORE UPDATE ON documentation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_bug_reports_updated_at') THEN
        CREATE TRIGGER update_bug_reports_updated_at BEFORE UPDATE ON bug_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;