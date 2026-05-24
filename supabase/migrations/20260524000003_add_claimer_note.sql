ALTER TABLE public.item_claims
  ADD COLUMN IF NOT EXISTS claimer_note text;
