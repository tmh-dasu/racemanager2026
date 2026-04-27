CREATE TABLE public.result_import_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  race_id UUID NOT NULL,
  session_type TEXT NOT NULL,
  saved_rows INTEGER NOT NULL DEFAULT 0,
  skipped_rows INTEGER NOT NULL DEFAULT 0,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'csv',
  imported_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.result_import_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read import log"
ON public.result_import_log FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert import log"
ON public.result_import_log FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_result_import_log_created_at ON public.result_import_log(created_at DESC);
CREATE INDEX idx_result_import_log_race_id ON public.result_import_log(race_id);