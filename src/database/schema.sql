-- ==============================================================================
-- SISTEMA DE GESTIÓN DE ESTUDIOS NOM-STPS
-- DDL DE BASE DE DATOS POSTGRESQL CON SEGURIDAD ROW-LEVEL SECURITY (RLS)
-- Creado: Noviembre 2026
-- ==============================================================================

-- 1. EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMERACIONES
DO $$ BEGIN
    CREATE TYPE rol_usuario AS ENUM ('ADMIN', 'ELABORADOR', 'REVISOR', 'CONSULTA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_estudio AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADO', 'POR_VENCER', 'VENCIDO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE estado_envio AS ENUM ('PENDIENTE', 'ENVIADO', 'ERROR');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABLA DE EMPRESAS (Tenants)
CREATE TABLE IF NOT EXISTS empresas (
    id SERIAL PRIMARY KEY,
    razon_social VARCHAR(255) NOT NULL,
    rfc VARCHAR(13) NOT NULL UNIQUE,
    domicilio_fiscal TEXT NOT NULL,
    representante_legal VARCHAR(255) NOT NULL,
    telefono_contacto VARCHAR(50),
    correo_contacto VARCHAR(255),
    logotipo_url TEXT,
    tipo_logotipo VARCHAR(50) DEFAULT 'image/png',
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. TABLA DE USUARIOS Y ROLES (Control de Acceso / RBAC)
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE,
    nombre_completo VARCHAR(255) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    hash_contrasena VARCHAR(255) NOT NULL,
    rol rol_usuario NOT NULL DEFAULT 'CONSULTA',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    ultimo_acceso TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TABLA DE CENTROS DE TRABAJO
CREATE TABLE IF NOT EXISTS centros_trabajo (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    domicilio TEXT NOT NULL,
    giro_actividad VARCHAR(255) NOT NULL,
    num_trabajadores INT NOT NULL DEFAULT 1,
    responsable_seguridad VARCHAR(255) NOT NULL,
    areas_puestos TEXT, -- JSON o lista de áreas
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. TABLA DE TIPOS DE ESTUDIO (Catálogo configurable de Normas NOM-STPS)
CREATE TABLE IF NOT EXISTS tipos_estudio (
    id SERIAL PRIMARY KEY,
    clave_nom VARCHAR(50) NOT NULL UNIQUE, -- Ej: NOM-011-STPS-2001
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    periodicidad_meses INT, -- Fijo o NULL si depende de matriz VLE
    categoria VARCHAR(50) NOT NULL, -- Salud, Seguridad, Organización, etc.
    plantilla_impresion VARCHAR(100) DEFAULT 'default_report',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. TABLA DE CAMPOS DE CAPTURA DINÁMICOS POR NOM
CREATE TABLE IF NOT EXISTS campos_estudio (
    id SERIAL PRIMARY KEY,
    tipo_estudio_id INT NOT NULL REFERENCES tipos_estudio(id) ON DELETE CASCADE,
    nombre_campo VARCHAR(100) NOT NULL,
    etiqueta VARCHAR(255) NOT NULL,
    tipo_dato VARCHAR(50) NOT NULL, -- text, number, date, select, table, textarea
    opciones JSONB, -- Opciones en caso de select
    obligatorio BOOLEAN NOT NULL DEFAULT FALSE,
    orden INT NOT NULL DEFAULT 0,
    unidad_medida VARCHAR(50),
    ayuda_normativa TEXT
);

-- 8. TABLA DE ELABORADORES (Padrón de personas, laboratorios o unidades de inspección)
CREATE TABLE IF NOT EXISTS elaboradores (
    id SERIAL PRIMARY KEY,
    empresa_id INT REFERENCES empresas(id) ON DELETE CASCADE, -- Si es propio, o NULL si es general
    nombre_razon_social VARCHAR(255) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- Persona Fisica, Laboratorio de Pruebas, Unidad de Inspeccion
    cedula_profesional VARCHAR(50),
    num_acreditacion_stps VARCHAR(100) NOT NULL, -- Acreditación EMA / STPS
    vigencia_acreditacion DATE NOT NULL,
    correo_contacto VARCHAR(255),
    telefono_contacto VARCHAR(50),
    firma_digitalizada_url TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. TABLA DE ESTUDIOS REALIZADOS
CREATE TABLE IF NOT EXISTS estudios (
    id SERIAL PRIMARY KEY,
    folio VARCHAR(50) NOT NULL UNIQUE, -- Ej: EST-2026-0001
    empresa_id INT NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id INT NOT NULL REFERENCES centros_trabajo(id) ON DELETE RESTRICT,
    tipo_estudio_id INT NOT NULL REFERENCES tipos_estudio(id) ON DELETE RESTRICT,
    elaborador_id INT NOT NULL REFERENCES elaboradores(id) ON DELETE RESTRICT,
    usuario_registro_id INT NOT NULL REFERENCES usuarios(id),
    usuario_revisor_id INT REFERENCES usuarios(id),
    fecha_realizacion DATE NOT NULL,
    fecha_vigencia DATE NOT NULL,
    estado estado_estudio NOT NULL DEFAULT 'BORRADOR',
    datos JSONB NOT NULL DEFAULT '{}'::jsonb, -- Datos capturados dinámicamente según la NOM
    observaciones_revision TEXT,
    fecha_aprobacion TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. TABLA DE ARCHIVOS ADJUNTOS (Evidencias, planos, memorias de cálculo)
CREATE TABLE IF NOT EXISTS adjuntos_estudio (
    id SERIAL PRIMARY KEY,
    estudio_id INT NOT NULL REFERENCES estudios(id) ON DELETE CASCADE,
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    almacen_url TEXT NOT NULL,
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. TABLA DE IMPRESIONES Y HUELLA DIGITAL SHA-256 (Integridad y no repudio)
CREATE TABLE IF NOT EXISTS impresiones (
    id SERIAL PRIMARY KEY,
    estudio_id INT NOT NULL REFERENCES estudios(id) ON DELETE RESTRICT,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    fecha_generacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ruta_pdf TEXT NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL, -- Sello criptográfico SHA-256
    es_oficial BOOLEAN NOT NULL DEFAULT FALSE
);

-- 12. TABLA DE ENVÍOS POR CORREO ELECTRÓNICO (Asíncrono con reintentos)
CREATE TABLE IF NOT EXISTS envios_correo (
    id SERIAL PRIMARY KEY,
    estudio_id INT NOT NULL REFERENCES estudios(id) ON DELETE RESTRICT,
    impresion_id INT REFERENCES impresiones(id),
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    asunto VARCHAR(255) NOT NULL,
    mensaje TEXT NOT NULL,
    estado estado_envio NOT NULL DEFAULT 'PENDIENTE',
    reintentos INT NOT NULL DEFAULT 0,
    ultimo_error TEXT,
    fecha_solicitud TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_envio TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS destinatarios_envio (
    id SERIAL PRIMARY KEY,
    envio_id INT NOT NULL REFERENCES envios_correo(id) ON DELETE CASCADE,
    correo VARCHAR(255) NOT NULL,
    nombre VARCHAR(255)
);

-- 13. TABLA DE BITÁCORA DE AUDITORÍA INMUTABLE (Trazabilidad estricta)
CREATE TABLE IF NOT EXISTS bitacora_auditoria (
    id BIGSERIAL PRIMARY KEY,
    empresa_id INT REFERENCES empresas(id),
    usuario_id INT REFERENCES usuarios(id),
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_origen VARCHAR(45),
    accion VARCHAR(100) NOT NULL, -- LOGIN, CREAR_ESTUDIO, APROBAR_ESTUDIO, IMPRIMIR, ENVIAR_CORREO, etc.
    entidad VARCHAR(50) NOT NULL, -- ESTUDIO, EMPRESA, USUARIO, etc.
    entidad_id INT,
    detalles JSONB
);

-- ==============================================================================
-- 14. POLÍTICAS DE SEGURIDAD ROW-LEVEL SECURITY (RLS) PARA MULTI-TENANCY
-- ==============================================================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE centros_trabajo ENABLE ROW LEVEL SECURITY;
ALTER TABLE estudios ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_auditoria ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento de estudios por empresa
CREATE POLICY tenant_estudios_policy ON estudios
    FOR ALL
    USING (
        empresa_id = NULLIF(current_setting('app.current_tenant_id', true), '')::INT
        OR current_setting('app.is_admin', true) = 'true'
    );

-- Política de centros de trabajo
CREATE POLICY tenant_centros_policy ON centros_trabajo
    FOR ALL
    USING (
        empresa_id = NULLIF(current_setting('app.current_tenant_id', true), '')::INT
        OR current_setting('app.is_admin', true) = 'true'
    );

-- ==============================================================================
-- 15. REGLA DE PROTECCIÓN DE RETENCIÓN LEGAL DE 5 AÑOS (RN-09)
-- ==============================================================================
CREATE OR REPLACE FUNCTION verificar_retencion_legal_estudio()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.estado = 'APROBADO' AND OLD.fecha_realizacion > (CURRENT_DATE - INTERVAL '5 years') THEN
        RAISE EXCEPTION 'REGLA RN-09: No es posible eliminar el estudio %. La legislación STPS exige conservar estudios por al menos 5 años a partir de la fecha de realización.', OLD.folio;
    END IF;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_proteger_retencion_legal ON estudios;
CREATE TRIGGER trg_proteger_retencion_legal
BEFORE DELETE ON estudios
FOR EACH ROW
EXECUTE FUNCTION verificar_retencion_legal_estudio();

-- ==============================================================================
-- 16. REPORTES DE REFERENCIA (fase 1, aún no cableado a la app)
-- La app sigue en MemoryStore. Este bloque es la migración del esquema.
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE estado_extraccion_reporte AS ENUM ('PENDIENTE', 'EXTRAIDO', 'CONFIRMADO', 'RECHAZADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS reportes_referencia (
    id SERIAL PRIMARY KEY,
    empresa_id INT NOT NULL REFERENCES empresas(id) ON DELETE RESTRICT,
    centro_trabajo_id INT NOT NULL REFERENCES centros_trabajo(id) ON DELETE RESTRICT,
    tipo_estudio_id INT NOT NULL REFERENCES tipos_estudio(id) ON DELETE RESTRICT,
    fecha_reporte DATE NOT NULL,
    nombre_archivo VARCHAR(255) NOT NULL,
    hash_sha256 VARCHAR(64) NOT NULL,
    tamano_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    estado_extraccion estado_extraccion_reporte NOT NULL DEFAULT 'PENDIENTE',
    advertencias JSONB NOT NULL DEFAULT '[]'::jsonb,
    motivo_rechazo TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resultados_espacio_referencia (
    id SERIAL PRIMARY KEY,
    reporte_referencia_id INT NOT NULL REFERENCES reportes_referencia(id) ON DELETE CASCADE,
    clave VARCHAR(32) NOT NULL,
    nombre TEXT NOT NULL DEFAULT '',
    area TEXT NOT NULL DEFAULT '',
    lel NUMERIC,
    o2 NUMERIC,
    h2s_ppm NUMERIC,
    co_ppm NUMERIC,
    fecha_medicion DATE,
    tipo_declarado VARCHAR(2),
    tipo_calculado VARCHAR(2),
    cumple BOOLEAN,
    UNIQUE (reporte_referencia_id, clave)
);

CREATE INDEX IF NOT EXISTS idx_reportes_referencia_ambito
    ON reportes_referencia (empresa_id, centro_trabajo_id, tipo_estudio_id, fecha_reporte DESC);

ALTER TABLE reportes_referencia ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_reportes_referencia_policy ON reportes_referencia;
CREATE POLICY tenant_reportes_referencia_policy ON reportes_referencia
    FOR ALL
    USING (
        empresa_id = NULLIF(current_setting('app.current_tenant_id', true), '')::INT
        OR current_setting('app.is_admin', true) = 'true'
    );
