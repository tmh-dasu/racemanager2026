ALTER TABLE public.managers ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX managers_user_id_unique ON public.managers(user_id) WHERE user_id IS NOT NULL;