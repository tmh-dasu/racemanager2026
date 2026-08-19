CREATE TABLE IF NOT EXISTS public.reminder_send_log (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null,
  race_id uuid not null,
  stage text not null,
  status text not null default 'sent',
  error_message text,
  created_at timestamptz not null default now(),
  unique (manager_id, race_id, stage)
);
GRANT ALL ON public.reminder_send_log TO service_role;
ALTER TABLE public.reminder_send_log ENABLE ROW LEVEL SECURITY;