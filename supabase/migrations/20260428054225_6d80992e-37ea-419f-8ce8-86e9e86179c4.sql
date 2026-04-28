
-- Revoke EXECUTE from public/anon/authenticated on internal SECURITY DEFINER functions
-- so they cannot be called over PostgREST. Trigger firing is unaffected because
-- triggers run with table privileges, not function EXECUTE grants.

DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'enforce_max_drivers()',
    'enforce_captain_deadline()',
    'enforce_transfer_values()',
    'protect_manager_fields()',
    'enforce_captain_limit()',
    'enforce_prediction_deadline()',
    'enforce_transfer_deadline()',
    'move_to_dlq(text, text, bigint, jsonb)',
    'read_email_batch(text, integer, integer)',
    'delete_email(text, bigint)',
    'enqueue_email(text, jsonb)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END$$;

-- has_role is used inside RLS policies and must remain callable by authenticated.
-- Revoke from anon and PUBLIC, keep authenticated.
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
