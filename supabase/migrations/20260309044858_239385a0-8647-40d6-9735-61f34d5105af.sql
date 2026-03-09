ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS department text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS position text DEFAULT NULL;