-- Délais de traitement : date de chaque étape d'une commande.
--   responded_at : le pharmacien a répondu (prix fixés ou commande refusée)
--   paid_at      : le paiement est confirmé par Galimo
--   delivered_at : la commande est livrée / retirée
-- Un déclencheur les renseigne au premier passage à l'étape, quel que soit
-- l'endroit du code qui change le statut (route, webhook, rattrapage).
-- Seul un vrai changement d'état est daté : les commandes déjà payées ou livrées
-- avant ce suivi gardent une date vide, plutôt qu'une date fausse.
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS responded_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

CREATE OR REPLACE FUNCTION orders_track_steps() RETURNS trigger AS $$
BEGIN
  IF NEW.responded_at IS NULL AND OLD.status = 'awaiting_pharmacist' AND NEW.status <> 'awaiting_pharmacist' THEN
    NEW.responded_at := now();
  END IF;
  IF NEW.paid_at IS NULL AND NEW.payment_status = 'paid' AND OLD.payment_status IS DISTINCT FROM 'paid' THEN
    NEW.paid_at := now();
  END IF;
  IF NEW.delivered_at IS NULL AND NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    NEW.delivered_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_track_steps ON orders;
CREATE TRIGGER trg_orders_track_steps
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION orders_track_steps();
