-- ============================================================
-- TRANS CONTROL - ESQUEMA + DATOS DE PRUEBA
-- Se ejecuta automáticamente al inicializar PostgreSQL
-- ============================================================

-- ── 1. EXTENSIONES ────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 2. TIPOS ENUM ────────────────────────────────────────────────────────────
DO $$ BEGIN
    CREATE TYPE rolenum AS ENUM ('GERENTE','SECRETARIA','COORDINADOR','TRANSPORTISTA','PRESIDENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estadoviajeenum AS ENUM ('DISPONIBLE','TRANSPORTISTA_ASIGNADO','EN_EJECUCION','COMPLETADO','CANCELADO','REPROGRAMADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE estadodocenum AS ENUM ('PENDIENTE','APROBADO','RECHAZADO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE tipodocenum AS ENUM ('CEDULA','LICENCIA_E','MATRICULA','REVISION_TECNICA','SOAT','PERMISO_PESOS');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 3. TABLAS ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS usuarios (
    id              SERIAL PRIMARY KEY,
    cedula          VARCHAR(13) UNIQUE NOT NULL,
    nombres         VARCHAR(150) NOT NULL,
    correo          VARCHAR(200) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    rol             rolenum NOT NULL DEFAULT 'TRANSPORTISTA',
    activo          BOOLEAN NOT NULL DEFAULT TRUE,
    direccion       VARCHAR(255),
    telefono        VARCHAR(20),
    token_reset     VARCHAR(255),
    token_reset_exp TIMESTAMP,
    creado_en       TIMESTAMP DEFAULT NOW(),
    actualizado_en  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_usuarios_cedula ON usuarios(cedula);
CREATE INDEX IF NOT EXISTS ix_usuarios_correo ON usuarios(correo);

CREATE TABLE IF NOT EXISTS transportistas (
    id             SERIAL PRIMARY KEY,
    usuario_id     INTEGER UNIQUE NOT NULL REFERENCES usuarios(id),
    placa_vehiculo VARCHAR(10),
    tipo_vehiculo  VARCHAR(50),
    capacidad_ton  NUMERIC(10,2),
    creado_en      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documentos (
    id               SERIAL PRIMARY KEY,
    transportista_id INTEGER NOT NULL REFERENCES transportistas(id) ON DELETE CASCADE,
    tipo             tipodocenum NOT NULL,
    nombre_archivo   VARCHAR(255) NOT NULL,
    contenido_pdf    BYTEA,
    ruta_archivo     VARCHAR(500),
    estado           estadodocenum DEFAULT 'PENDIENTE',
    fecha_vencimiento TIMESTAMP,
    observacion      TEXT,
    revisado_por_id  INTEGER REFERENCES usuarios(id),
    subido_en        TIMESTAMP DEFAULT NOW(),
    revisado_en      TIMESTAMP
);

CREATE TABLE IF NOT EXISTS viajes (
    id                  SERIAL PRIMARY KEY,
    codigo              VARCHAR(20) UNIQUE NOT NULL,
    transportista_id    INTEGER REFERENCES transportistas(id),
    creado_por_id       INTEGER NOT NULL REFERENCES usuarios(id),
    tipo_mercancia      VARCHAR(100) NOT NULL,
    peso_total_kg       NUMERIC(12,2) NOT NULL,
    dimensiones         VARCHAR(100),
    numero_contenedor   VARCHAR(50),
    peso_contenedor_kg  NUMERIC(12,2),
    origen              VARCHAR(255) NOT NULL,
    destino             VARCHAR(255) NOT NULL,
    ruta_json           TEXT,
    latitud_origen      NUMERIC(10,8),
    longitud_origen     NUMERIC(10,8),
    latitud_destino     NUMERIC(10,8),
    longitud_destino    NUMERIC(10,8),
    latitud_actual      NUMERIC(10,8),
    longitud_actual     NUMERIC(10,8),
    punto_recepcion     VARCHAR(255),
    destinatario_nombre VARCHAR(200),
    destinatario_tel    VARCHAR(20),
    destinatario_correo VARCHAR(200),
    estado              estadoviajeenum DEFAULT 'DISPONIBLE',
    fecha_salida        TIMESTAMP,
    fecha_llegada_est   TIMESTAMP,
    fecha_llegada_real  TIMESTAMP,
    horas_retraso       NUMERIC(6,2) DEFAULT 0,
    causa_retraso       VARCHAR(255),
    causa_cancelacion   VARCHAR(255),
    observaciones       TEXT,
    creado_en           TIMESTAMP DEFAULT NOW(),
    actualizado_en      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ix_viajes_codigo ON viajes(codigo);

CREATE TABLE IF NOT EXISTS auditoria (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INTEGER REFERENCES usuarios(id),
    viaje_id    INTEGER REFERENCES viajes(id),
    accion      VARCHAR(100) NOT NULL,
    descripcion TEXT,
    ip_address  VARCHAR(45),
    fecha       TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ── 4. USUARIOS DE PRUEBA ─────────────────────────────────────────────────────
-- Contraseña para todos: Admin1234!
-- Hash bcrypt generado con: passlib.hash.bcrypt.hash("Admin1234!")

-- GERENTE
INSERT INTO usuarios (cedula, nombres, correo, hashed_password, rol, activo, telefono)
SELECT '0000000001', 'Administrador TransControl', 'admin@transcontrol.ec',
        '$2b$12$LJ3m4ys3Lk0TSwHCpNqrAOg7zMAZqHBQU2rpHGRqNsG5bV5VJ7n3y',
        'GERENTE', TRUE, '0990000001'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'admin@transcontrol.ec');

-- SECRETARIA
INSERT INTO usuarios (cedula, nombres, correo, hashed_password, rol, activo, telefono)
SELECT '0000000002', 'María Elena Vargas', 'secretaria@transcontrol.ec',
        '$2b$12$LJ3m4ys3Lk0TSwHCpNqrAOg7zMAZqHBQU2rpHGRqNsG5bV5VJ7n3y',
        'SECRETARIA', TRUE, '0990000002'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'secretaria@transcontrol.ec');

-- COORDINADOR
INSERT INTO usuarios (cedula, nombres, correo, hashed_password, rol, activo, telefono)
SELECT '0000000003', 'Juan Carlos Martinez', 'coordinador@transcontrol.ec',
        '$2b$12$LJ3m4ys3Lk0TSwHCpNqrAOg7zMAZqHBQU2rpHGRqNsG5bV5VJ7n3y',
        'COORDINADOR', TRUE, '0990000003'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'coordinador@transcontrol.ec');

-- TRANSPORTISTA 1 - Carlos Mendoza
INSERT INTO usuarios (cedula, nombres, correo, hashed_password, rol, activo, telefono)
SELECT '1712345678', 'Carlos Mendoza', 'transportista@transcontrol.ec',
        '$2b$12$LJ3m4ys3Lk0TSwHCpNqrAOg7zMAZqHBQU2rpHGRqNsG5bV5VJ7n3y',
        'TRANSPORTISTA', TRUE, '0991112233'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'transportista@transcontrol.ec');

-- TRANSPORTISTA 2 - Luis Silva
INSERT INTO usuarios (cedula, nombres, correo, hashed_password, rol, activo, telefono)
SELECT '1709876543', 'Luis Alberto Silva', 'luis.silva@transcontrol.ec',
        '$2b$12$LJ3m4ys3Lk0TSwHCpNqrAOg7zMAZqHBQU2rpHGRqNsG5bV5VJ7n3y',
        'TRANSPORTISTA', TRUE, '0992223344'
WHERE NOT EXISTS (SELECT 1 FROM usuarios WHERE correo = 'luis.silva@transcontrol.ec');

-- ── 5. PERFILES DE TRANSPORTISTAS ────────────────────────────────────────────
INSERT INTO transportistas (usuario_id, placa_vehiculo, tipo_vehiculo, capacidad_ton)
SELECT id, 'PBA-1234', 'Camión de Carga Pesada', 15.0
FROM usuarios WHERE correo = 'transportista@transcontrol.ec'
AND NOT EXISTS (SELECT 1 FROM transportistas WHERE placa_vehiculo = 'PBA-1234');

INSERT INTO transportistas (usuario_id, placa_vehiculo, tipo_vehiculo, capacidad_ton)
SELECT id, 'GYA-9876', 'Tráiler', 20.0
FROM usuarios WHERE correo = 'luis.silva@transcontrol.ec'
AND NOT EXISTS (SELECT 1 FROM transportistas WHERE placa_vehiculo = 'GYA-9876');

-- ── 6. DOCUMENTOS DE PRUEBA ───────────────────────────────────────────────────
DO $$
DECLARE
    t_id    INTEGER;
    s_id    INTEGER;
BEGIN
    -- IDs de Carlos y Secretaria
    SELECT id INTO t_id FROM transportistas WHERE placa_vehiculo = 'PBA-1234';
    SELECT id INTO s_id FROM usuarios WHERE correo = 'secretaria@transcontrol.ec';

    IF t_id IS NOT NULL AND s_id IS NOT NULL THEN
        -- CÉDULA (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'CEDULA', 'CEDULA_ejemplo.pdf', NULL, NULL, 'APROBADO', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

        -- LICENCIA E (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, fecha_vencimiento, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'LICENCIA_E', 'LICENCIA_E_ejemplo.pdf', NULL, NULL, 'APROBADO', NOW() + INTERVAL '2 years', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

        -- MATRÍCULA (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, fecha_vencimiento, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'MATRICULA', 'MATRICULA_ejemplo.pdf', NULL, NULL, 'APROBADO', NOW() + INTERVAL '1 year', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

        -- REVISIÓN TÉCNICA (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, fecha_vencimiento, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'REVISION_TECNICA', 'REVISION_TECNICA_ejemplo.pdf', NULL, NULL, 'APROBADO', NOW() + INTERVAL '6 months', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

        -- SOAT (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, fecha_vencimiento, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'SOAT', 'SOAT_ejemplo.pdf', NULL, NULL, 'APROBADO', NOW() + INTERVAL '8 months', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');

        -- PERMISO DE PESOS (APROBADO)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, fecha_vencimiento, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'PERMISO_PESOS', 'PERMISO_PESOS_ejemplo.pdf', NULL, NULL, 'APROBADO', NOW() + INTERVAL '1 year', s_id, NOW() - INTERVAL '5 days', NOW() - INTERVAL '4 days');
    END IF;

    -- Luis Silva (transportista con placa GYA-9876)
    SELECT id INTO t_id FROM transportistas WHERE placa_vehiculo = 'GYA-9876';

    IF t_id IS NOT NULL AND s_id IS NOT NULL THEN
        -- CÉDULA (PENDIENTE)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, subido_en)
        VALUES (t_id, 'CEDULA', 'CEDULA_luis.pdf', NULL, NULL, 'PENDIENTE', NOW() - INTERVAL '1 day');

        -- LICENCIA E (RECHAZADA)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, observacion, revisado_por_id, subido_en, revisado_en)
        VALUES (t_id, 'LICENCIA_E', 'LICENCIA_E_luis.pdf', NULL, NULL, 'RECHAZADO', 'La licencia no corresponde al Tipo E exigido', s_id, NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day');

        -- MATRÍCULA (PENDIENTE)
        INSERT INTO documentos (transportista_id, tipo, nombre_archivo, ruta_archivo, contenido_pdf, estado, subido_en)
        VALUES (t_id, 'MATRICULA', 'MATRICULA_luis.pdf', NULL, NULL, 'PENDIENTE', NOW() - INTERVAL '1 day');
    END IF;
END$$;