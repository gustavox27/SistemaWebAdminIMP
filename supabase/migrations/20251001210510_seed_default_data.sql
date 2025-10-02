/*
  # Datos Iniciales del Sistema

  Inserta datos por defecto para el sistema de gestión de impresoras.

  ## Datos Incluidos
  - Usuario responsable por defecto
  - Operador técnico por defecto
  - Modelos de tóner comunes
  - Modelos de fusor comunes
  - Plantillas de tickets predefinidas
  - Configuración inicial de la aplicación
*/

-- Insertar usuario responsable por defecto (solo si no existe)
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

-- Insertar operador por defecto (solo si no existe)
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

-- Insertar modelos de tóner comunes (solo si no existen)
INSERT INTO toner_models (id, name, description, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'W9004mc', '', now(), now()),
  ('00000000-0000-0000-0000-000000000004', 'W9008mc', '', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insertar modelos de fusor comunes (solo si no existen)
INSERT INTO fuser_models (id, name, lifespan, description, created_at, updated_at)
VALUES
  ('00000000-0000-0000-0000-000000000005', 'RM2-5425', 100000, 'Fusor HP LaserJet', now(), now()),
  ('00000000-0000-0000-0000-000000000006', 'RM2-6308', 150000, 'Fusor HP LaserJet Pro', now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insertar plantillas de tickets predefinidas (solo si no existen)
INSERT INTO ticket_templates (id, title, detail, usage_count, created_at, updated_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000007',
    'Problema de Impresión',
    'La impresora no está imprimiendo correctamente. Se requiere revisión técnica para identificar y solucionar el problema.',
    0,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000008',
    'Atasco de Papel',
    'Se ha detectado un atasco de papel en la impresora. Se necesita asistencia para remover el papel atascado y verificar el funcionamiento.',
    0,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000009',
    'Mantenimiento Preventivo',
    'Solicitud de mantenimiento preventivo programado para la impresora. Incluye limpieza, calibración y verificación de componentes.',
    0,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Insertar configuración inicial de la aplicación (solo si no existe)
INSERT INTO app_settings (key, value, created_at, updated_at)
VALUES
  ('defaultUser', 'Freddy Moscoso', now(), now()),
  ('defaultOperator', 'Gustavo', now(), now()),
  ('activeTab', 'dashboard', now(), now())
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();