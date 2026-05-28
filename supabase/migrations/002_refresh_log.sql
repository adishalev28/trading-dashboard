-- Migration: Refresh log for rate limiting
-- Created: 2026-05-28
-- Purpose: Track manual refresh triggers per user, enforce daily quota

-- ============================================================================
-- 1. Create refresh_log table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.refresh_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email  TEXT NOT NULL,
  triggered_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_admin    BOOLEAN DEFAULT FALSE NOT NULL,
  status      TEXT DEFAULT 'triggered',  -- triggered | failed
  error       TEXT
);

-- Indexes for fast quota queries
CREATE INDEX IF NOT EXISTS idx_refresh_log_user_date
  ON public.refresh_log(user_email, triggered_at DESC);

-- ============================================================================
-- 2. Enable RLS
-- ============================================================================
ALTER TABLE public.refresh_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own refresh log" ON public.refresh_log;
DROP POLICY IF EXISTS "Admins can see all refresh logs" ON public.refresh_log;

-- Users can see their own log (for quota display)
CREATE POLICY "Users can see own refresh log"
  ON public.refresh_log FOR SELECT
  USING (auth.jwt() ->> 'email' = user_email);

-- Admins can see all logs (for monitoring)
CREATE POLICY "Admins can see all refresh logs"
  ON public.refresh_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.allowed_users
      WHERE email = (auth.jwt() ->> 'email')
        AND is_admin = TRUE
        AND active = TRUE
    )
  );

-- ============================================================================
-- 3. Helper: count refreshes today for a user
-- ============================================================================
CREATE OR REPLACE FUNCTION public.refreshes_today(p_email TEXT)
RETURNS INT
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.refresh_log
  WHERE user_email = p_email
    AND triggered_at >= CURRENT_DATE
    AND triggered_at < CURRENT_DATE + INTERVAL '1 day';
$$;

-- ============================================================================
-- 4. Cleanup: auto-delete logs older than 30 days (optional housekeeping)
-- ============================================================================
-- Note: run manually or via a cron job
-- DELETE FROM public.refresh_log WHERE triggered_at < NOW() - INTERVAL '30 days';

COMMENT ON TABLE public.refresh_log IS 'Tracks manual refresh triggers per user for rate limiting (3/day for non-admins)';
