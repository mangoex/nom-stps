-- Migración incremental: reportes de referencia NOM-033.
-- Todavía no está cableada a la aplicación (sigue el MemoryStore).
-- Pensada para una base que ya tiene el resto de src/database/schema.sql.

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
