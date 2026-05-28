-- Migration: Allowed Users + RLS
-- Created: 2026-05-28
-- Purpose: User whitelist system with admin management

-- ============================================================================
-- 1. Create allowed_users table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.allowed_users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  active      BOOLEAN DEFAULT TRUE NOT NULL,
  is_admin    BOOLEAN DEFAULT FALSE NOT NULL,
  expires_at  TIMESTAMPTZ,  -- NULL = no expiration
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_allowed_users_email ON public.allowed_users(email);
CREATE INDEX IF NOT EXISTS idx_allowed_users_active ON public.allowed_users(active);

-- ============================================================================
-- 2. Update trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_allowed_users_updated_at ON public.allowed_users;
CREATE TRIGGER trigger_allowed_users_updated_at
  BEFORE UPDATE ON public.allowed_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================
ALTER TABLE public.allowed_users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. RLS Policies
-- ============================================================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own allowed_user row" ON public.allowed_users;
DROP POLICY IF EXISTS "Admins can read all allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "Admins can insert allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "Admins can update allowed_users" ON public.allowed_users;
DROP POLICY IF EXISTS "Admins can delete allowed_users" ON public.allowed_users;

-- Policy: Users can see their own row (to check active/expiry status)
CREATE POLICY "Users can read own allowed_user row"
  ON public.allowed_users FOR SELECT
  USING (auth.jwt() ->> 'email' = email);

-- Policy: Admins can see all
CREATE POLICY "Admins can read all allowed_users"
  ON public.allowed_users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = (auth.jwt() ->> 'email')
        AND is_admin = TRUE
        AND active = TRUE
    )
  );

-- Policy: Admins can insert
CREATE POLICY "Admins can insert allowed_users"
  ON public.allowed_users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = (auth.jwt() ->> 'email')
        AND is_admin = TRUE
        AND active = TRUE
    )
  );

-- Policy: Admins can update
CREATE POLICY "Admins can update allowed_users"
  ON public.allowed_users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = (auth.jwt() ->> 'email')
        AND is_admin = TRUE
        AND active = TRUE
    )
  );

-- Policy: Admins can delete (but cannot delete themselves)
CREATE POLICY "Admins can delete allowed_users"
  ON public.allowed_users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = (auth.jwt() ->> 'email')
        AND is_admin = TRUE
        AND active = TRUE
    )
    AND email != (auth.jwt() ->> 'email')  -- Cannot delete self
  );

-- ============================================================================
-- 5. Helper function: Check if current user is allowed
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_current_user_allowed()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.allowed_users
    WHERE email = (auth.jwt() ->> 'email')
      AND active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ============================================================================
-- 6. Insert initial admin (Adi)
-- ============================================================================
INSERT INTO public.allowed_users (email, name, active, is_admin, notes)
VALUES ('adishalev28@gmail.com', 'Adi Shalev', TRUE, TRUE, 'Owner/Admin - created via migration')
ON CONFLICT (email) DO UPDATE
  SET is_admin = TRUE, active = TRUE;

-- ============================================================================
-- 7. Helpful comments
-- ============================================================================
COMMENT ON TABLE public.allowed_users IS 'Whitelist of users allowed to access the dashboard';
COMMENT ON COLUMN public.allowed_users.active IS 'TRUE = can login. Toggle to disable access instantly';
COMMENT ON COLUMN public.allowed_users.expires_at IS 'NULL = no expiration. Otherwise auto-blocks after this date';
COMMENT ON COLUMN public.allowed_users.is_admin IS 'TRUE = can manage other users via /admin/users';
