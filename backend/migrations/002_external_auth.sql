-- Permet aux comptes créés via le webhook galimo.tech de ne pas avoir de mot de passe local
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE users ADD COLUMN external_id text UNIQUE;
