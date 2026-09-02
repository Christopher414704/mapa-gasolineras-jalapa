import { database } from "../config/database.js";

export async function obtenerGasolinerasConPrecios() {
  const consulta = `
    SELECT
      g.id AS id_gasolinera,
      g.nombre AS nombre_gasolinera,
      g.codigo AS codigo_gasolinera,
      g.direccion,
      g.municipio,
      g.departamento,
      g.pais,
      g.latitud,
      g.longitud,

      m.id AS id_marca,
      m.nombre AS nombre_marca,
      m.codigo AS codigo_marca,
      m.url_logo,
      m.color_principal,

      modelo.id AS id_modelo,
      modelo.ruta_archivo,
      modelo.escala,
      modelo.orientacion_grados,
      modelo.inclinacion_grados,
      modelo.balanceo_grados,
      modelo.altura_metros,

      cg.id AS id_combustible,
      cg.nombre_comercial,
      cg.codigo AS codigo_combustible,
      cg.orden_visual AS orden_combustible,

      tc.id AS id_tipo_combustible,
      tc.nombre AS nombre_tipo_combustible,
      tc.codigo AS codigo_tipo_combustible,

      ms.id AS id_modalidad,
      ms.nombre AS nombre_modalidad,
      ms.codigo AS codigo_modalidad,
      ms.orden_visual AS orden_modalidad,

      pc.precio,
      TRIM(pc.codigo_moneda) AS codigo_moneda,
      pc.unidad_medida,
      pc.fecha_vigencia_inicio

    FROM gasolineras g

    INNER JOIN marcas m
      ON m.id = g.id_marca
      AND m.activo = TRUE

    LEFT JOIN modelos_3d_gasolinera modelo
      ON modelo.id_gasolinera = g.id
      AND modelo.activo = TRUE

    LEFT JOIN combustibles_gasolinera cg
      ON cg.id_gasolinera = g.id
      AND cg.activo = TRUE

    LEFT JOIN tipos_combustible tc
      ON tc.id = cg.id_tipo_combustible
      AND tc.activo = TRUE

    LEFT JOIN precios_combustible pc
      ON pc.id_combustible_gasolinera = cg.id
      AND pc.fecha_vigencia_fin IS NULL

    LEFT JOIN modalidades_servicio ms
      ON ms.id = pc.id_modalidad_servicio
      AND ms.activo = TRUE

    WHERE g.activo = TRUE

    ORDER BY
      g.nombre,
      cg.orden_visual,
      ms.orden_visual;
  `;

  const resultado = await database.query(consulta);

  return resultado.rows;
}