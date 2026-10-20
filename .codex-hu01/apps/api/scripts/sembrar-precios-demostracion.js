import { database } from "../src/config/database.js";

const productos = [
  {
    tipo: "regular",
    nombre: "Regular",
    codigo: "regular",
    orden: 1,
    precios: {
      autoservicio: 29.19,
      servicio_manual: 29.49,
    },
  },
  {
    tipo: "super",
    nombre: "Súper",
    codigo: "super",
    orden: 2,
    precios: {
      autoservicio: 30.69,
      servicio_manual: 30.99,
    },
  },
  {
    tipo: "premium",
    nombre: "Premium",
    codigo: "premium",
    orden: 3,
    precios: {
      autoservicio: 31.19,
      servicio_manual: 31.49,
    },
  },
  {
    tipo: "diesel",
    nombre: "Diésel",
    codigo: "diesel",
    orden: 4,
    precios: {
      autoservicio: 26.39,
      servicio_manual: 26.69,
    },
  },
];

async function sembrarPrecios() {
  const cliente = await database.connect();

  try {
    await cliente.query("BEGIN");

    const resultadoGasolinera = await cliente.query(
      `
        SELECT id
        FROM gasolineras
        WHERE codigo = $1
          AND activo = TRUE;
      `,
      ["gasolinera-demo-jalapa"],
    );

    if (resultadoGasolinera.rowCount === 0) {
      throw new Error(
        "No existe la Gasolinera Demo Jalapa.",
      );
    }

    const idGasolinera = resultadoGasolinera.rows[0].id;

    const resultadoGestor = await cliente.query(
      `
        SELECT id
        FROM usuarios
        WHERE LOWER(nombre_usuario) = LOWER($1::TEXT)
          AND id_gasolinera = $2
          AND activo = TRUE;
      `,
      ["gestor_demo", idGasolinera],
    );

    if (resultadoGestor.rowCount === 0) {
      throw new Error(
        "No existe el gestor activo de la gasolinera.",
      );
    }

    const idGestor = resultadoGestor.rows[0].id;

    const resultadoTipos = await cliente.query(`
      SELECT id, codigo
      FROM tipos_combustible
      WHERE activo = TRUE;
    `);

    const tipos = Object.fromEntries(
      resultadoTipos.rows.map((tipo) => [
        tipo.codigo,
        tipo.id,
      ]),
    );

    const resultadoModalidades = await cliente.query(`
      SELECT id, codigo
      FROM modalidades_servicio
      WHERE activo = TRUE;
    `);

    const modalidades = Object.fromEntries(
      resultadoModalidades.rows.map((modalidad) => [
        modalidad.codigo,
        modalidad.id,
      ]),
    );

    let preciosCreados = 0;
    let preciosExistentes = 0;

    for (const producto of productos) {
      const idTipo = tipos[producto.tipo];

      if (!idTipo) {
        throw new Error(
          `No existe el tipo de combustible ${producto.tipo}.`,
        );
      }

      const resultadoCombustible = await cliente.query(
        `
          INSERT INTO combustibles_gasolinera (
            id_gasolinera,
            id_tipo_combustible,
            nombre_comercial,
            codigo,
            orden_visual
          )
          VALUES (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          ON CONFLICT (
            id_gasolinera,
            codigo
          )
          DO UPDATE SET
            id_tipo_combustible =
              EXCLUDED.id_tipo_combustible,
            nombre_comercial =
              EXCLUDED.nombre_comercial,
            orden_visual =
              EXCLUDED.orden_visual,
            activo = TRUE
          RETURNING id;
        `,
        [
          idGasolinera,
          idTipo,
          producto.nombre,
          producto.codigo,
          producto.orden,
        ],
      );

      const idCombustible =
        resultadoCombustible.rows[0].id;

      for (const [
        codigoModalidad,
        precio,
      ] of Object.entries(producto.precios)) {
        const idModalidad =
          modalidades[codigoModalidad];

        if (!idModalidad) {
          throw new Error(
            `No existe la modalidad ${codigoModalidad}.`,
          );
        }

        const resultadoPrecio = await cliente.query(
          `
            INSERT INTO precios_combustible (
              id_combustible_gasolinera,
              id_modalidad_servicio,
              id_usuario_registro,
              precio,
              codigo_moneda,
              unidad_medida,
              observacion
            )
            SELECT
              $1::BIGINT,
              $2::BIGINT,
              $3::BIGINT,
              $4::NUMERIC,
              'GTQ',
              'galon',
              'Precio inicial de demostración'
            WHERE NOT EXISTS (
              SELECT 1
              FROM precios_combustible
              WHERE id_combustible_gasolinera =
                      $1::BIGINT
                AND id_modalidad_servicio =
                      $2::BIGINT
                AND fecha_vigencia_fin IS NULL
            )
            RETURNING id;
          `,
          [
            idCombustible,
            idModalidad,
            idGestor,
            precio,
          ],
        );

        if (resultadoPrecio.rowCount === 1) {
          preciosCreados += 1;
        } else {
          preciosExistentes += 1;
        }
      }
    }

    await cliente.query("COMMIT");

    console.log("Precios procesados correctamente.");
    console.log(`Precios creados: ${preciosCreados}`);
    console.log(
      `Precios que ya existían: ${preciosExistentes}`,
    );
  } catch (error) {
    await cliente.query("ROLLBACK");
    throw error;
  } finally {
    cliente.release();
  }
}

sembrarPrecios()
  .catch((error) => {
    console.error(
      "No fue posible crear los precios:",
      error.message,
    );

    process.exitCode = 1;
  })
  .finally(async () => {
    await database.end();
  });