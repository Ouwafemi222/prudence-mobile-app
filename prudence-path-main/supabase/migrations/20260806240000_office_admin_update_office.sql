-- Phase 6: office_admin can update own office name/settings (slug/status protected)

CREATE OR REPLACE FUNCTION public.guard_office_admin_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF public.user_is_super_admin(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF public.user_is_office_admin(auth.uid(), OLD.id) THEN
    NEW.slug := OLD.slug;
    NEW.status := OLD.status;
    NEW.plan := OLD.plan;
    NEW.timezone := OLD.timezone;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_office_admin_update ON public.offices;
CREATE TRIGGER trg_guard_office_admin_update
  BEFORE UPDATE ON public.offices
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_office_admin_update();

CREATE POLICY "Office admin updates own office"
  ON public.offices FOR UPDATE
  TO authenticated
  USING (public.user_is_office_admin(auth.uid(), id))
  WITH CHECK (public.user_is_office_admin(auth.uid(), id));
