-- Pharmacy Galimo - schéma initial (PostgreSQL autonome, sans RLS Supabase)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  display_name text,
  phone text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'pharmacy_partner', 'user')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pharmacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES users(id),
  name text NOT NULL,
  logo_url text,
  address text,
  neighborhood text,
  city text,
  phone text,
  whatsapp text,
  email text,
  delivery_fee_gnf integer NOT NULL DEFAULT 0,
  delivery_zones text[] DEFAULT '{}',
  delivery_cities text[] DEFAULT '{}',
  opening_hours jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_verified boolean NOT NULL DEFAULT false,
  rating numeric(2,1) DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES users(id),
  name text NOT NULL,
  price integer NOT NULL,
  original_price integer,
  category text,
  form text,
  laboratory text,
  image_url text,
  rating numeric(2,1) DEFAULT 0,
  review_count integer NOT NULL DEFAULT 0,
  description text,
  indication text,
  active_substance text,
  in_stock boolean NOT NULL DEFAULT true,
  discount integer DEFAULT 0,
  requires_prescription boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  pharmacy_id uuid NOT NULL REFERENCES pharmacies(id),
  status text NOT NULL DEFAULT 'pending',
  payment_status text NOT NULL DEFAULT 'unpaid',
  total_amount integer NOT NULL DEFAULT 0,
  delivery_fee integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES medicines(id),
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  subtotal integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES users(id),
  sender_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicines_pharmacy ON medicines(pharmacy_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_pharmacy ON orders(pharmacy_id);
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_messages_order ON order_messages(order_id);
