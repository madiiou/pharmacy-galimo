-- Blocage de compte après plusieurs échecs de connexion, en plus de la limite
-- par IP déjà en place : protège contre un brute-force réparti sur plusieurs
-- adresses IP, qui contournerait une limite purement par IP.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz,
  -- Séparé de updated_at : une connexion normale ne doit pas se confondre
  -- avec une vraie modification du compte (email, mot de passe...) quand on
  -- enquête plus tard sur un incident — exactement ce qui a servi à innocenter
  -- le compte de la pharmacienne lors de l'intrusion du 1er octobre.
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
