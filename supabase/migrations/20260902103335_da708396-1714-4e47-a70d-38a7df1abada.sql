ALTER TABLE public.email_send_state
  ADD COLUMN IF NOT EXISTS lock_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz;

CREATE OR REPLACE FUNCTION public.email_queue_try_lock(p_lease_seconds integer DEFAULT 120)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  UPDATE public.email_send_state
     SET lock_expires_at = now() + make_interval(secs => greatest(10, least(600, p_lease_seconds))),
         last_run_at = now(),
         updated_at = now()
   WHERE id = 1
     AND (lock_expires_at IS NULL OR lock_expires_at < now())
  RETURNING true INTO v_ok;
  RETURN coalesce(v_ok, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.email_queue_release_lock()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.email_send_state
     SET lock_expires_at = NULL, updated_at = now()
   WHERE id = 1;
$$;

REVOKE ALL ON FUNCTION public.email_queue_try_lock(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_release_lock() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.email_queue_try_lock(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.email_queue_release_lock() TO service_role;