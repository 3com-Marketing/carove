ALTER TABLE public.cash_sessions
  ADD COLUMN IF NOT EXISTS cash_income numeric(12,2),
  ADD COLUMN IF NOT EXISTS cash_expense numeric(12,2),
  ADD COLUMN IF NOT EXISTS settlement_status text;