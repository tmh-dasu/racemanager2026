-- Prediction questions per race
CREATE TABLE public.prediction_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  question_type text NOT NULL CHECK (question_type IN ('final_winner', 'fastest_qualifying', 'tier_winner', 'most_points')),
  question_text text NOT NULL,
  correct_answer text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(race_id)
);

ALTER TABLE public.prediction_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prediction_questions" ON public.prediction_questions FOR SELECT TO public USING (true);
CREATE POLICY "Admins can insert prediction_questions" ON public.prediction_questions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update prediction_questions" ON public.prediction_questions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete prediction_questions" ON public.prediction_questions FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Prediction answers from managers
CREATE TABLE public.prediction_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.prediction_questions(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE,
  answer text NOT NULL,
  is_correct boolean DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(question_id, manager_id)
);

ALTER TABLE public.prediction_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read prediction_answers" ON public.prediction_answers FOR SELECT TO public USING (true);
CREATE POLICY "Owner can insert prediction_answer" ON public.prediction_answers FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.managers WHERE managers.id = prediction_answers.manager_id AND managers.user_id = auth.uid()));
CREATE POLICY "Owner can update prediction_answer" ON public.prediction_answers FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.managers WHERE managers.id = prediction_answers.manager_id AND managers.user_id = auth.uid()));

-- Season predictions
CREATE TABLE public.season_predictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manager_id uuid NOT NULL REFERENCES public.managers(id) ON DELETE CASCADE UNIQUE,
  driver_id uuid NOT NULL REFERENCES public.drivers(id),
  is_correct boolean DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.season_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read season_predictions" ON public.season_predictions FOR SELECT TO public USING (true);
CREATE POLICY "Owner can insert season_prediction" ON public.season_predictions FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.managers WHERE managers.id = season_predictions.manager_id AND managers.user_id = auth.uid()));

-- Enforce prediction deadline (reuse captain_deadline from races)
CREATE OR REPLACE FUNCTION public.enforce_prediction_deadline()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  deadline timestamp with time zone;
  race_id_val uuid;
BEGIN
  SELECT pq.race_id INTO race_id_val FROM public.prediction_questions pq WHERE pq.id = NEW.question_id;
  SELECT r.captain_deadline INTO deadline FROM public.races r WHERE r.id = race_id_val;
  
  IF deadline IS NOT NULL AND now() > deadline THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Prediction deadline has passed for this race';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE TRIGGER enforce_prediction_deadline_trigger
  BEFORE INSERT OR UPDATE ON public.prediction_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_prediction_deadline();