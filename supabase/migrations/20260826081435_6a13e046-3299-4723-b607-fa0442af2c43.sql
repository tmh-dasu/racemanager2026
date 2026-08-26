CREATE TABLE IF NOT EXISTS public.reminder_job_state (
  id text PRIMARY KEY DEFAULT 'captain_reminder',
  paused boolean NOT NULL DEFAULT false,
  lock_expires_at timestamptz,
  last_run_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.reminder_job_state TO authenticated;
GRANT ALL ON public.reminder_job_state TO service_role;

ALTER TABLE public.reminder_job_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reminder job state"
ON public.reminder_job_state FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.reminder_job_state (id) VALUES ('captain_reminder')
ON CONFLICT (id) DO NOTHING;