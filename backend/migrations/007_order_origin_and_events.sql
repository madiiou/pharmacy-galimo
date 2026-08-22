-- Qui a initie la commande : le client lui-meme (self-service ou devis
-- demande) ou la pharmacie (devis compose au telephone pour un appelant).
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'client';

-- Evenements bruts cote client, sans compte requis (ex: clic sur un lien
-- WhatsApp) - permet de savoir si les gens utilisent reellement les canaux
-- de contact / paiement de l'appli plutot qu'un canal externe.
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  pharmacy_id uuid REFERENCES pharmacies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_pharmacy ON events(pharmacy_id);
