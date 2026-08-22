ALTER TABLE medicines
  ADD COLUMN IF NOT EXISTS posologie text,
  ADD COLUMN IF NOT EXISTS contre_indication text;
