-- Permet au pharmacien de composer un devis avec des articles hors catalogue
ALTER TABLE order_items ALTER COLUMN medicine_id DROP NOT NULL;
ALTER TABLE order_items ADD COLUMN item_name text;
ALTER TABLE order_items ADD CONSTRAINT order_items_medicine_or_name
  CHECK (medicine_id IS NOT NULL OR item_name IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
