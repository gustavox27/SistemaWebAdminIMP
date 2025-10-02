/*
  # Sistema de Gestión de Impresoras y Tóners - Esquema Completo

  ## Tablas Principales

  ### 1. users (usuarios responsables)
    - `id` (uuid, primary key)
    - `name` (text, nombre completo)
    - `contact` (text, información de contacto)
    - `position` (text, cargo/posición)
    - `empresa` (text, nombre de empresa)
    - `usuario_windows` (text, usuario de windows)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 2. operators (técnicos operadores)
    - `id` (uuid, primary key)
    - `name` (text, nombre completo)
    - `contact` (text, teléfono/contacto)
    - `location` (text, ubicación asignada)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 3. toner_models (modelos de tóner)
    - `id` (uuid, primary key)
    - `name` (text, modelo del tóner)
    - `capacity` (integer, capacidad en páginas)
    - `description` (text, descripción opcional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 4. fuser_models (modelos de fusor)
    - `id` (uuid, primary key)
    - `name` (text, modelo del fusor)
    - `lifespan` (integer, vida útil en páginas)
    - `description` (text, descripción opcional)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 5. printers (impresoras)
    - `id` (uuid, primary key)
    - `brand` (text, marca)
    - `model` (text, modelo)
    - `location` (text, ubicación)
    - `type` (text, monocromatica o color)
    - `ip` (text, dirección IP)
    - `hostname` (text, nombre de host)
    - `serial` (text, número de serie)
    - `status` (text, operativa|disponible|backup|retirada)
    - `sede` (text, sede o sucursal)
    - `hostname_server` (text, servidor host)
    - `ip_server` (text, IP del servidor)
    - `toner_capacity` (integer, capacidad del tóner)
    - `current_toner_level` (numeric, nivel actual de tóner)
    - `daily_usage` (integer, uso diario en páginas)
    - `motor_cycle` (integer, ciclo del motor)
    - `toner_model` (text, modelo de tóner)
    - `color_toners` (jsonb, tóners de color)
    - `has_backup_toner` (boolean, tiene tóner de respaldo)
    - `motor_cycle_pending` (boolean, ciclo pendiente)
    - `comment` (text, comentarios adicionales)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 6. toner_inventory (inventario de tóners)
    - `id` (uuid, primary key)
    - `printer_id` (uuid, foreign key)
    - `toner_model` (text, modelo del tóner)
    - `description` (text, descripción)
    - `quantity` (integer, cantidad disponible)
    - `on_loan` (boolean, en préstamo - legacy)
    - `loan_message` (text, mensaje de préstamo - legacy)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 7. toner_orders (pedidos de tóners)
    - `id` (uuid, primary key)
    - `tracking_number` (text, número de seguimiento)
    - `printer_id` (uuid, foreign key)
    - `color_toner_id` (text, ID del tóner de color)
    - `toner_model` (text, modelo del tóner)
    - `description` (text, descripción)
    - `quantity` (integer, cantidad)
    - `order_date` (timestamptz, fecha de pedido)
    - `arrival_date` (timestamptz, fecha de llegada)
    - `status` (text, pendiente|llegado)
    - `reason` (text, razón del pedido)
    - `email_sent` (boolean, correo enviado)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 8. toner_changes (historial de cambios de tóner)
    - `id` (uuid, primary key)
    - `change_date` (timestamptz, fecha del cambio)
    - `printer_id` (uuid, foreign key)
    - `printer_serial` (text, serial de impresora)
    - `toner_model` (text, modelo del tóner)
    - `motor_cycle` (integer, ciclo en el momento del cambio)
    - `printer_ip` (text, IP de la impresora)
    - `responsible` (text, responsable)
    - `operator` (text, operador)
    - `is_backup` (boolean, es tóner de respaldo)
    - `motor_cycle_pending` (boolean, ciclo pendiente)
    - `created_at` (timestamptz)

  ### 9. toner_loans (préstamos de tóners)
    - `id` (uuid, primary key)
    - `inventory_id` (uuid, ID del inventario)
    - `lender_printer_id` (uuid, impresora que presta)
    - `borrower_printer_id` (uuid, impresora que recibe)
    - `lender_location` (text, ubicación prestamista)
    - `borrower_location` (text, ubicación receptor)
    - `toner_model` (text, modelo del tóner)
    - `quantity` (integer, cantidad)
    - `loan_date` (timestamptz, fecha del préstamo)
    - `return_date` (timestamptz, fecha de devolución)
    - `loan_message` (text, mensaje)
    - `returned_by` (text, devuelto por)
    - `is_returned` (boolean, fue devuelto)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 10. empty_toners (tóners vacíos)
    - `id` (uuid, primary key)
    - `toner_model` (text, modelo del tóner)
    - `printer_model` (text, modelo de impresora)
    - `printer_location` (text, ubicación de impresora)
    - `change_date` (timestamptz, fecha del cambio)
    - `category` (text, area|warehouse|shipped)
    - `status` (text, pending_cycle|ready_pickup|ready_shipping|shipped)
    - `is_backup` (boolean, es de respaldo)
    - `motor_cycle_captured` (boolean, ciclo capturado)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 11. printer_fusers (fusores de impresoras)
    - `id` (uuid, primary key)
    - `printer_id` (uuid, foreign key)
    - `fuser_model` (text, modelo del fusor)
    - `lifespan` (integer, vida útil)
    - `pages_used` (integer, páginas usadas)
    - `installation_date` (timestamptz, fecha de instalación)
    - `last_update` (timestamptz, última actualización)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 12. tickets (tickets de soporte)
    - `id` (uuid, primary key)
    - `user_name` (text, nombre del usuario)
    - `printer_id` (uuid, foreign key)
    - `area` (text, área)
    - `assistance_title` (text, título de asistencia)
    - `assistance_detail` (text, detalle de asistencia)
    - `is_service_request` (boolean, es solicitud de servicio)
    - `is_incident` (boolean, es incidente)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 13. ticket_templates (plantillas de tickets)
    - `id` (uuid, primary key)
    - `title` (text, título de plantilla)
    - `detail` (text, detalle de plantilla)
    - `usage_count` (integer, veces usada)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ### 14. app_settings (configuración de la aplicación)
    - `id` (uuid, primary key)
    - `key` (text, unique, clave de configuración)
    - `value` (text, valor)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  ## Seguridad
  - Row Level Security (RLS) habilitado en todas las tablas
  - Políticas públicas para operaciones básicas (aplicación de usuario único)
*/

-- Crear tablas

-- users
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text DEFAULT '',
  position text DEFAULT '',
  empresa text DEFAULT '',
  usuario_windows text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- operators
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- toner_models
CREATE TABLE IF NOT EXISTS toner_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  capacity integer DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- fuser_models
CREATE TABLE IF NOT EXISTS fuser_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lifespan integer NOT NULL DEFAULT 100000,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- printers
CREATE TABLE IF NOT EXISTS printers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  model text NOT NULL,
  location text NOT NULL,
  type text NOT NULL CHECK (type IN ('monocromatica', 'color')),
  ip text DEFAULT '',
  hostname text DEFAULT '',
  serial text NOT NULL,
  status text NOT NULL DEFAULT 'operativa' CHECK (status IN ('operativa', 'disponible', 'backup', 'retirada')),
  sede text DEFAULT '',
  hostname_server text DEFAULT '',
  ip_server text DEFAULT '',
  toner_capacity integer DEFAULT 0,
  current_toner_level numeric DEFAULT 100,
  daily_usage integer DEFAULT 0,
  motor_cycle integer DEFAULT 0,
  toner_model text DEFAULT '',
  color_toners jsonb DEFAULT '[]'::jsonb,
  has_backup_toner boolean DEFAULT false,
  motor_cycle_pending boolean DEFAULT false,
  comment text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- toner_inventory
CREATE TABLE IF NOT EXISTS toner_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid REFERENCES printers(id) ON DELETE CASCADE,
  toner_model text NOT NULL,
  description text DEFAULT '',
  quantity integer DEFAULT 0,
  on_loan boolean DEFAULT false,
  loan_message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- toner_orders
CREATE TABLE IF NOT EXISTS toner_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_number text NOT NULL,
  printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  color_toner_id text DEFAULT '',
  toner_model text NOT NULL,
  description text DEFAULT '',
  quantity integer DEFAULT 1,
  order_date timestamptz DEFAULT now(),
  arrival_date timestamptz,
  status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'llegado')),
  reason text DEFAULT '',
  email_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- toner_changes
CREATE TABLE IF NOT EXISTS toner_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  change_date timestamptz DEFAULT now(),
  printer_id uuid REFERENCES printers(id) ON DELETE CASCADE,
  printer_serial text NOT NULL,
  toner_model text NOT NULL,
  motor_cycle integer DEFAULT 0,
  printer_ip text DEFAULT '',
  responsible text NOT NULL,
  operator text NOT NULL,
  is_backup boolean DEFAULT false,
  motor_cycle_pending boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- toner_loans
CREATE TABLE IF NOT EXISTS toner_loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inventory_id text NOT NULL,
  lender_printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  borrower_printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  lender_location text NOT NULL,
  borrower_location text NOT NULL,
  toner_model text NOT NULL,
  quantity integer DEFAULT 1,
  loan_date timestamptz DEFAULT now(),
  return_date timestamptz,
  loan_message text DEFAULT '',
  returned_by text DEFAULT '',
  is_returned boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- empty_toners
CREATE TABLE IF NOT EXISTS empty_toners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  toner_model text NOT NULL,
  printer_model text NOT NULL,
  printer_location text NOT NULL,
  change_date timestamptz DEFAULT now(),
  category text DEFAULT 'warehouse' CHECK (category IN ('area', 'warehouse', 'shipped')),
  status text NOT NULL DEFAULT 'pending_cycle' CHECK (status IN ('pending_cycle', 'ready_pickup', 'ready_shipping', 'shipped')),
  is_backup boolean DEFAULT false,
  motor_cycle_captured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- printer_fusers
CREATE TABLE IF NOT EXISTS printer_fusers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  printer_id uuid REFERENCES printers(id) ON DELETE CASCADE,
  fuser_model text NOT NULL,
  lifespan integer NOT NULL DEFAULT 100000,
  pages_used integer DEFAULT 0,
  installation_date timestamptz DEFAULT now(),
  last_update timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- tickets
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  area text NOT NULL,
  assistance_title text NOT NULL,
  assistance_detail text NOT NULL,
  is_service_request boolean DEFAULT false,
  is_incident boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ticket_templates
CREATE TABLE IF NOT EXISTS ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  detail text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Crear índices para mejorar el rendimiento

CREATE INDEX IF NOT EXISTS idx_printers_status ON printers(status);
CREATE INDEX IF NOT EXISTS idx_printers_type ON printers(type);
CREATE INDEX IF NOT EXISTS idx_printers_location ON printers(location);
CREATE INDEX IF NOT EXISTS idx_toner_inventory_printer_id ON toner_inventory(printer_id);
CREATE INDEX IF NOT EXISTS idx_toner_orders_printer_id ON toner_orders(printer_id);
CREATE INDEX IF NOT EXISTS idx_toner_orders_status ON toner_orders(status);
CREATE INDEX IF NOT EXISTS idx_toner_changes_printer_id ON toner_changes(printer_id);
CREATE INDEX IF NOT EXISTS idx_toner_changes_change_date ON toner_changes(change_date);
CREATE INDEX IF NOT EXISTS idx_toner_loans_lender_printer_id ON toner_loans(lender_printer_id);
CREATE INDEX IF NOT EXISTS idx_toner_loans_borrower_printer_id ON toner_loans(borrower_printer_id);
CREATE INDEX IF NOT EXISTS idx_toner_loans_is_returned ON toner_loans(is_returned);
CREATE INDEX IF NOT EXISTS idx_empty_toners_status ON empty_toners(status);
CREATE INDEX IF NOT EXISTS idx_printer_fusers_printer_id ON printer_fusers(printer_id);
CREATE INDEX IF NOT EXISTS idx_tickets_printer_id ON tickets(printer_id);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- Habilitar Row Level Security

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuser_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE toner_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE empty_toners ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_fusers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Crear políticas públicas (aplicación de usuario único)

-- users
CREATE POLICY "Permitir acceso público a users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);

-- operators
CREATE POLICY "Permitir acceso público a operators" ON operators FOR ALL TO anon USING (true) WITH CHECK (true);

-- toner_models
CREATE POLICY "Permitir acceso público a toner_models" ON toner_models FOR ALL TO anon USING (true) WITH CHECK (true);

-- fuser_models
CREATE POLICY "Permitir acceso público a fuser_models" ON fuser_models FOR ALL TO anon USING (true) WITH CHECK (true);

-- printers
CREATE POLICY "Permitir acceso público a printers" ON printers FOR ALL TO anon USING (true) WITH CHECK (true);

-- toner_inventory
CREATE POLICY "Permitir acceso público a toner_inventory" ON toner_inventory FOR ALL TO anon USING (true) WITH CHECK (true);

-- toner_orders
CREATE POLICY "Permitir acceso público a toner_orders" ON toner_orders FOR ALL TO anon USING (true) WITH CHECK (true);

-- toner_changes
CREATE POLICY "Permitir acceso público a toner_changes" ON toner_changes FOR ALL TO anon USING (true) WITH CHECK (true);

-- toner_loans
CREATE POLICY "Permitir acceso público a toner_loans" ON toner_loans FOR ALL TO anon USING (true) WITH CHECK (true);

-- empty_toners
CREATE POLICY "Permitir acceso público a empty_toners" ON empty_toners FOR ALL TO anon USING (true) WITH CHECK (true);

-- printer_fusers
CREATE POLICY "Permitir acceso público a printer_fusers" ON printer_fusers FOR ALL TO anon USING (true) WITH CHECK (true);

-- tickets
CREATE POLICY "Permitir acceso público a tickets" ON tickets FOR ALL TO anon USING (true) WITH CHECK (true);

-- ticket_templates
CREATE POLICY "Permitir acceso público a ticket_templates" ON ticket_templates FOR ALL TO anon USING (true) WITH CHECK (true);

-- app_settings
CREATE POLICY "Permitir acceso público a app_settings" ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);