-- Le client peut demander un devis (sans prix fixé) avec un mode de livraison
ALTER TABLE orders ADD COLUMN delivery_mode text;
ALTER TABLE orders ADD COLUMN city text;
ALTER TABLE orders ADD COLUMN delivery_address text;

-- Le pharmacien indique la disponibilité de chaque article lors du devis
ALTER TABLE order_items ADD COLUMN is_available boolean;
