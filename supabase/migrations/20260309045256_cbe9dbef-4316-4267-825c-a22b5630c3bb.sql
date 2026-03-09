-- Add more profile fields for employee directory
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_schedule text DEFAULT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text DEFAULT NULL;