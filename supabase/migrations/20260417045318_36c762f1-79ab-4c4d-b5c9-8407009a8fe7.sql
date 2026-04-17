INSERT INTO public.user_payments (user_id, amount, paid_at, stripe_session_id)
SELECT m.user_id, 4900, m.created_at, 'backfill'
FROM public.managers m
WHERE m.user_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.user_payments p WHERE p.user_id = m.user_id);