export const shorthands = undefined;

export function up(pgm) {
  pgm.sql(`
    CREATE TABLE registros_auditoria (
      id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      id_usuario BIGINT,
      id_gasolinera BIGINT,
      accion VARCHAR(100) NOT NULL,
      entidad VARCHAR(100) NOT NULL,
      id_registro BIGINT,
      datos_anteriores JSONB,
      datos_nuevos JSONB,
      direccion_ip INET,
      agente_usuario TEXT,
      origen VARCHAR(30) NOT NULL DEFAULT 'api',
      resultado VARCHAR(20) NOT NULL DEFAULT 'exitoso',
      detalle TEXT,
      fecha_evento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_auditoria_usuario
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      CONSTRAINT fk_auditoria_gasolinera
        FOREIGN KEY (id_gasolinera)
        REFERENCES gasolineras(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

      CONSTRAINT chk_auditoria_resultado
        CHECK (
          resultado IN ('exitoso', 'fallido')
        ),

      CONSTRAINT chk_auditoria_origen
        CHECK (
          origen IN ('api', 'sistema', 'base_datos')
        )
    );

    CREATE INDEX idx_auditoria_fecha_evento
      ON registros_auditoria (fecha_evento DESC);

    CREATE INDEX idx_auditoria_id_usuario
      ON registros_auditoria (id_usuario);

    CREATE INDEX idx_auditoria_id_gasolinera
      ON registros_auditoria (id_gasolinera);

    CREATE INDEX idx_auditoria_entidad_registro
      ON registros_auditoria (entidad, id_registro);

    CREATE OR REPLACE FUNCTION impedir_modificacion_auditoria()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    BEGIN
      RAISE EXCEPTION
        'Los registros de auditoría no pueden modificarse ni eliminarse.';
    END;
    $$;

    CREATE TRIGGER trg_proteger_registros_auditoria
    BEFORE UPDATE OR DELETE ON registros_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION impedir_modificacion_auditoria();

    CREATE OR REPLACE FUNCTION auditar_nuevo_precio()
    RETURNS TRIGGER
    LANGUAGE plpgsql
    AS $$
    DECLARE
      gasolinera_precio BIGINT;
      precio_anterior NUMERIC(10, 2);
    BEGIN
      SELECT cg.id_gasolinera
      INTO gasolinera_precio
      FROM combustibles_gasolinera cg
      WHERE cg.id = NEW.id_combustible_gasolinera;

      SELECT pc.precio
      INTO precio_anterior
      FROM precios_combustible pc
      WHERE pc.id_combustible_gasolinera =
              NEW.id_combustible_gasolinera
        AND pc.id_modalidad_servicio =
              NEW.id_modalidad_servicio
        AND pc.id <> NEW.id
        AND pc.fecha_vigencia_fin =
              NEW.fecha_vigencia_inicio
      ORDER BY pc.fecha_vigencia_inicio DESC
      LIMIT 1;

      INSERT INTO registros_auditoria (
        id_usuario,
        id_gasolinera,
        accion,
        entidad,
        id_registro,
        datos_anteriores,
        datos_nuevos,
        origen,
        resultado,
        detalle
      )
      VALUES (
        NEW.id_usuario_registro,
        gasolinera_precio,
        'cambio_precio',
        'precios_combustible',
        NEW.id,

        CASE
          WHEN precio_anterior IS NULL THEN NULL
          ELSE jsonb_build_object(
            'precio',
            precio_anterior
          )
        END,

        jsonb_build_object(
          'precio',
          NEW.precio,
          'codigo_moneda',
          TRIM(NEW.codigo_moneda),
          'unidad_medida',
          NEW.unidad_medida,
          'id_combustible_gasolinera',
          NEW.id_combustible_gasolinera,
          'id_modalidad_servicio',
          NEW.id_modalidad_servicio,
          'fecha_vigencia_inicio',
          NEW.fecha_vigencia_inicio
        ),

        'base_datos',
        'exitoso',
        'Precio registrado correctamente.'
      );

      RETURN NEW;
    END;
    $$;

    CREATE TRIGGER trg_auditar_nuevo_precio
    AFTER INSERT ON precios_combustible
    FOR EACH ROW
    EXECUTE FUNCTION auditar_nuevo_precio();
  `);
}

export function down(pgm) {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_auditar_nuevo_precio
      ON precios_combustible;

    DROP FUNCTION IF EXISTS auditar_nuevo_precio();

    DROP TABLE IF EXISTS registros_auditoria;

    DROP FUNCTION IF EXISTS impedir_modificacion_auditoria();
  `);
}