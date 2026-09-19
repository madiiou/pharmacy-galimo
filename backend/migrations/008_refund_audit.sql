-- Trace des remboursements : motif obligatoire, auteur et date, pour pouvoir
-- controler (console Galimo) pourquoi et par qui une commande a ete remboursee.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refund_reason text,
  ADD COLUMN IF NOT EXISTS refund_note text,
  ADD COLUMN IF NOT EXISTS refunded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS refunded_at timestamptz;
