/*
  # Base de Datos Completa - Estructura con Correcciones

  Esta migración crea la estructura completa de la base de datos con todas las columnas necesarias.

  ## Tablas Creadas

  ### 1. users (Usuarios Responsables)
    - Almacena información de usuarios responsables de impresoras
    - Campos: nombre, contacto, posición, empresa, usuario Windows

  ### 2. operators (Técnicos Operadores)
    - Información de técnicos que operan las impresoras
    - Campos: nombre, contacto, ubicación

  ### 3. toner_models (Modelos de Tóner)
    - Catálogo de modelos de tóner
    - Campos: nombre, capacidad, descripción

  ### 4. fuser_models (Modelos de Fusor)
    - Catálogo de modelos de fusor
    - Campos: nombre, vida útil, descripción

  ### 5. printers (Impresoras)
    - Registro de todas las impresoras
    - Campos: marca, modelo, ubicación, tipo, IP, serial, estado, etc.

  ### 6. toner_inventory (Inventario de Tóners)
    - Control de inventario de tóners
    - Relación: printer_id → printers

  ### 7. toner_orders (Pedidos de Tóners)
    - Gestión de pedidos de tóners
    - Relación: printer_id → printers

  ### 8. toner_changes (Historial de Cambios)
    - Registro de cambios de tóner realizados
    - Relación: printer_id → printers
    - **INCLUYE updated_at para actualizaciones**

  ### 9. toner_loans (Préstamos de Tóners)
    - Gestión de préstamos entre impresoras
    - Relaciones: lender_printer_id, borrower_printer_id → printers

  ### 10. empty_toners (Tóners Vacíos)
    - Control de tóners vacíos y su estado
    - Campos: modelo, ubicación, categoría, estado

  ### 11. printer_fusers (Fusores de Impresoras)
    - Control de fusores instalados en impresoras
    - Relación: printer_id → printers

  ### 12. tickets (Tickets de Soporte)
    - Sistema de tickets de asistencia técnica
    - Relación: printer_id → printers
    - **INCLUYE copied_at, moved_to_history, history_move_date**

  ### 13. ticket_templates (Plantillas de Tickets)
    - Plantillas predefinidas para tickets

  ### 14. app_settings (Configuración de la Aplicación)
    - Configuraciones generales de la aplicación

  ## Seguridad
  - Row Level Security (RLS) habilitado en todas las tablas
  - Políticas públicas configuradas para acceso anónimo
  - Índices creados para optimizar rendimiento

  ## Correcciones Aplicadas
  1. Agregada columna `updated_at` a `toner_changes`
  2. Agregadas columnas `copied_at`, `moved_to_history`, `history_move_date` a `tickets`
*/

-- =====================================================
-- CREAR TABLAS
-- =====================================================

-- Tabla: users
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

-- Tabla: operators
CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: toner_models
CREATE TABLE IF NOT EXISTS toner_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  capacity integer DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: fuser_models
CREATE TABLE IF NOT EXISTS fuser_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lifespan integer NOT NULL DEFAULT 100000,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: printers
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

-- Tabla: toner_inventory
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

-- Tabla: toner_orders
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

-- Tabla: toner_changes (CON updated_at)
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
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: toner_loans
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

-- Tabla: empty_toners
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

-- Tabla: printer_fusers
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

-- Tabla: tickets (CON copied_at, moved_to_history, history_move_date)
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name text NOT NULL,
  printer_id uuid REFERENCES printers(id) ON DELETE SET NULL,
  area text NOT NULL,
  assistance_title text NOT NULL,
  assistance_detail text NOT NULL,
  is_service_request boolean DEFAULT false,
  is_incident boolean DEFAULT false,
  copied_at timestamptz,
  moved_to_history boolean DEFAULT false,
  history_move_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: ticket_templates
CREATE TABLE IF NOT EXISTS ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  detail text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabla: app_settings
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- CREAR ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

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
CREATE INDEX IF NOT EXISTS idx_tickets_moved_to_history ON tickets(moved_to_history);
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);

-- =====================================================
-- HABILITAR ROW LEVEL SECURITY
-- =====================================================

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

-- =====================================================
-- CREAR POLÍTICAS DE ACCESO PÚBLICO
-- =====================================================

CREATE POLICY "Permitir acceso público a users" 
  ON users FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a operators" 
  ON operators FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a toner_models" 
  ON toner_models FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a fuser_models" 
  ON fuser_models FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a printers" 
  ON printers FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a toner_inventory" 
  ON toner_inventory FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a toner_orders" 
  ON toner_orders FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a toner_changes" 
  ON toner_changes FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a toner_loans" 
  ON toner_loans FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a empty_toners" 
  ON empty_toners FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a printer_fusers" 
  ON printer_fusers FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a tickets" 
  ON tickets FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a ticket_templates" 
  ON ticket_templates FOR ALL TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Permitir acceso público a app_settings" 
  ON app_settings FOR ALL TO anon USING (true) WITH CHECK (true);