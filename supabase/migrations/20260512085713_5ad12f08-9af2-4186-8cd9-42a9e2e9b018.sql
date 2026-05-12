
-- 1. Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
  id bigserial PRIMARY KEY,
  table_name text NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
  row_id uuid,
  actor_user_id uuid,
  actor_role text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table_time ON public.audit_log(table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_row ON public.audit_log(row_id);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON public.audit_log(actor_user_id);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read audit log"
  ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- No insert/update/delete policies → only triggers (SECURITY DEFINER) can write

-- 2. Generic trigger function
CREATE OR REPLACE FUNCTION public.fn_audit_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row_id uuid;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_old := to_jsonb(OLD);
    v_row_id := (v_old->>'id')::uuid;
  ELSIF TG_OP = 'INSERT' THEN
    v_new := to_jsonb(NEW);
    v_row_id := (v_new->>'id')::uuid;
  ELSE
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_row_id := (v_new->>'id')::uuid;
  END IF;

  INSERT INTO public.audit_log (table_name, operation, row_id, actor_user_id, actor_role, old_data, new_data)
  VALUES (TG_TABLE_NAME, TG_OP, v_row_id, auth.uid(), auth.role(), v_old, v_new);

  RETURN COALESCE(NEW, OLD);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_audit_log() FROM PUBLIC, anon, authenticated;

-- 3. Attach to critical tables
DROP TRIGGER IF EXISTS audit_transfers ON public.transfers;
CREATE TRIGGER audit_transfers
  AFTER INSERT OR UPDATE OR DELETE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

DROP TRIGGER IF EXISTS audit_race_results ON public.race_results;
CREATE TRIGGER audit_race_results
  AFTER INSERT OR UPDATE OR DELETE ON public.race_results
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

DROP TRIGGER IF EXISTS audit_captain_selections ON public.captain_selections;
CREATE TRIGGER audit_captain_selections
  AFTER INSERT OR UPDATE OR DELETE ON public.captain_selections
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

DROP TRIGGER IF EXISTS audit_manager_drivers ON public.manager_drivers;
CREATE TRIGGER audit_manager_drivers
  AFTER INSERT OR UPDATE OR DELETE ON public.manager_drivers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();

DROP TRIGGER IF EXISTS audit_prediction_answers ON public.prediction_answers;
CREATE TRIGGER audit_prediction_answers
  AFTER INSERT OR UPDATE OR DELETE ON public.prediction_answers
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_log();
