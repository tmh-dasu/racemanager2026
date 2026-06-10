
-- Lock down internal SECURITY DEFINER functions: only postgres/service_role may call them directly.
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.enforce_max_drivers()',
    'public.enforce_captain_deadline()',
    'public.fn_audit_log()',
    'public.enforce_transfer_values()',
    'public.protect_manager_fields()',
    'public.enforce_captain_limit()',
    'public.move_to_dlq(text, text, bigint, jsonb)',
    'public.enqueue_email(text, jsonb)',
    'public.read_email_batch(text, integer, integer)',
    'public.delete_email(text, bigint)',
    'public.trg_recompute_on_race_result()',
    'public.trg_recompute_on_transfer()',
    'public.trg_recompute_on_captain()',
    'public.trg_recompute_on_prediction()',
    'public.recompute_manager_round(uuid, uuid)',
    'public.enforce_transfer_deadline()',
    'public.enforce_prediction_deadline()',
    'public.trg_recompute_on_race_change()',
    'public.recompute_manager_all_rounds(uuid)',
    'public.recompute_race_all_managers(uuid)',
    'public.enforce_manager_email_matches_user()'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', fn);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', fn);
  END LOOP;
END $$;
