-- Drop existing triggers if they exist, then recreate
DROP TRIGGER IF EXISTS enforce_prediction_deadline_trigger ON public.prediction_answers;
DROP TRIGGER IF EXISTS enforce_captain_deadline_trigger ON public.captain_selections;
DROP TRIGGER IF EXISTS enforce_captain_limit_trigger ON public.captain_selections;
DROP TRIGGER IF EXISTS enforce_max_drivers_trigger ON public.manager_drivers;
DROP TRIGGER IF EXISTS enforce_transfer_values_trigger ON public.transfers;
DROP TRIGGER IF EXISTS protect_manager_fields_trigger ON public.managers;

-- Prediction deadline enforcement
CREATE TRIGGER enforce_prediction_deadline_trigger
BEFORE INSERT OR UPDATE ON public.prediction_answers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prediction_deadline();

-- Captain deadline enforcement
CREATE TRIGGER enforce_captain_deadline_trigger
BEFORE INSERT OR UPDATE ON public.captain_selections
FOR EACH ROW
EXECUTE FUNCTION public.enforce_captain_deadline();

-- Captain limit (max 2 per tier per season)
CREATE TRIGGER enforce_captain_limit_trigger
BEFORE INSERT OR UPDATE ON public.captain_selections
FOR EACH ROW
EXECUTE FUNCTION public.enforce_captain_limit();

-- Max 3 drivers per manager
CREATE TRIGGER enforce_max_drivers_trigger
BEFORE INSERT ON public.manager_drivers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_max_drivers();

-- Auto-calculate transfer point cost based on tier
CREATE TRIGGER enforce_transfer_values_trigger
BEFORE INSERT ON public.transfers
FOR EACH ROW
EXECUTE FUNCTION public.enforce_transfer_values();

-- Protect manager points/budget from non-admin updates
CREATE TRIGGER protect_manager_fields_trigger
BEFORE UPDATE ON public.managers
FOR EACH ROW
EXECUTE FUNCTION public.protect_manager_fields();