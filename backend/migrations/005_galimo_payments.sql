-- Suivi du débit demandé auprès de l'API Partenaire Galimo pour une commande
ALTER TABLE orders ADD COLUMN payment_reference text UNIQUE;
ALTER TABLE orders ADD COLUMN payment_idrequest text;
