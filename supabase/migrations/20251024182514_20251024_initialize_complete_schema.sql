/*
  # Inicialización del Esquema Completo del Sistema

  Esta migración establece el esquema completo del sistema de gestión de impresoras
  con todas las tablas, índices, políticas RLS y datos iniciales.

  1. Tablas Creadas
    - users: Usuarios responsables
    - operators: Técnicos operadores
    - toner_models: Modelos de tóner
    - fuser_models: Modelos de fusor
    - printers: Impresoras
    - toner_inventory: Inventario de tóners
    - toner_orders: Pedidos de tóners
    - toner_changes: Historial de cambios
    - toner_loans: Préstamos de tóners
    - empty_toners: Tóners vacíos
    - printer_fusers: Fusores de impresoras
    - tickets: Tickets de soporte
    - ticket_templates: Plantillas de tickets
    - app_settings: Configuración de la aplicación

  2. Índices de Optimización
    - Índices en campos de búsqueda frecuente
    - Índices para JOIN operations
    - Índices de texto completo para búsquedas en users

  3. Seguridad
    - RLS habilitado en todas las tablas
    - Políticas de acceso público configuradas

  4. Datos Iniciales
    - Usuario predeterminado (Freddy Moscoso)
    - Operador predeterminado (Gustavo Corrales)
    - Modelos de tóner y fusor iniciales
    - Plantillas de tickets predefinidas
    - Configuración inicial de la aplicación
*/

-- =====================================================
-- CREAR TABLAS
-- =====================================================

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

CREATE TABLE IF NOT EXISTS operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  contact text DEFAULT '',
  location text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS toner_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  capacity integer DEFAULT 0,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fuser_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  lifespan integer NOT NULL DEFAULT 100000,
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS ticket_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  detail text NOT NULL,
  usage_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

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

CREATE INDEX IF NOT EXISTS idx_users_name ON users(name);
CREATE INDEX IF NOT EXISTS idx_users_empresa ON users(empresa);
CREATE INDEX IF NOT EXISTS idx_users_usuario_windows ON users(usuario_windows);
CREATE INDEX IF NOT EXISTS idx_users_position ON users(position);
CREATE INDEX IF NOT EXISTS idx_users_name_lower ON users(lower(name));
CREATE INDEX IF NOT EXISTS idx_users_empresa_lower ON users(lower(empresa));
CREATE INDEX IF NOT EXISTS idx_users_usuario_windows_lower ON users(lower(usuario_windows));

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

-- =====================================================
-- INSERTAR DATOS INICIALES
-- =====================================================

INSERT INTO users (id, name, contact, position, empresa, usuario_windows, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Freddy Moscoso',
  '',
  'Responsable',
  'Gloria S.A.',
  'fmoscoso',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO operators (id, name, contact, location, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Gustavo Corrales',
  '960950894',
  'Planta Gloria - Huachipa',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO toner_models (name, description, created_at, updated_at)
VALUES
  ('W9004mc', '', now(), now()),
  ('W9008mc', '', now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO fuser_models (name, lifespan, description, created_at, updated_at)
VALUES
  ('RM2-5425', 100000, 'Fusor HP LaserJet', now(), now()),
  ('RM2-6308', 150000, 'Fusor HP LaserJet Pro', now(), now())
ON CONFLICT (name) DO NOTHING;

INSERT INTO ticket_templates (title, detail, usage_count, created_at, updated_at)
VALUES
  (
    'Problema de Impresión',
    'La impresora no está imprimiendo correctamente. Se requiere revisión técnica para identificar y solucionar el problema.',
    0,
    now(),
    now()
  ),
  (
    'Atasco de Papel',
    'Se ha detectado un atasco de papel en la impresora. Se necesita asistencia para remover el papel atascado y verificar el funcionamiento.',
    0,
    now(),
    now()
  ),
  (
    'Mantenimiento Preventivo',
    'Solicitud de mantenimiento preventivo programado para la impresora. Incluye limpieza, calibración y verificación de componentes.',
    0,
    now(),
    now()
  )
ON CONFLICT DO NOTHING;

INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES
  ('defaultUser', 'Freddy Moscoso', now(), now()),
  ('defaultOperator', 'Gustavo', now(), now()),
  ('activeTab', 'dashboard', now(), now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();