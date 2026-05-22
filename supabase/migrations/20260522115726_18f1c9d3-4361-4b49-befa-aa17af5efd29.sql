
-- 1) Stop exposing prediction_questions.correct_answer publicly.
-- The prediction_questions_public view already omits correct_answer; clients should use it.
DROP POLICY IF EXISTS "Public can read published prediction_questions" ON public.prediction_questions;

-- 2) Enforce that managers.email matches the authenticated user's email,
--    so users cannot direct admin bulk emails to arbitrary recipients.
CREATE OR REPLACE FUNCTION public.enforce_manager_email_matches_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auth_email text;
BEGIN
  -- Allow service role and admins to set any email (admin tools, backfills, support).
  IF auth.role() = 'service_role' THEN
    RETURN NEW;
  END IF;
  IF auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- For regular users, the email must match their authenticated email.
  v_auth_email := lower(coalesce(auth.email(), ''));
  IF v_auth_email = '' THEN
    RAISE EXCEPTION 'Authentication required to set manager email';
  END IF;

  IF lower(NEW.email) <> v_auth_email THEN
    RAISE EXCEPTION 'Manager email must match your account email';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_manager_email_matches_user_trg ON public.managers;
CREATE TRIGGER enforce_manager_email_matches_user_trg
  BEFORE INSERT OR UPDATE OF email ON public.managers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_manager_email_matches_user();
