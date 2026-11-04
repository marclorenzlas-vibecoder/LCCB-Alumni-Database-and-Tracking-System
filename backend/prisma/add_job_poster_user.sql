ALTER TABLE public.job_posting
  ADD COLUMN IF NOT EXISTS posted_by_user_id INTEGER;
