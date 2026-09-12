import {
  Cartesian2,
  Cartesian3,
  Color,
  HeadingPitchRoll,
  HeightReference,
  LabelStyle,
  Math as CesiumMath,
  Transforms,
  VerticalOrigin,
} from "cesium";

import { GASOLINERAS_JALAPA } from "./gasolineras-jalapa.datos.js";

function fichaSinPrecios(estacion) {
  return {
    id: estacion.id,
    idApi: estacion.idApi,
    nombre: estacion.nombre,
    marca: {
      nombre: estacion.marca,
      colorPrincipal: estacion.color,
    },
    ubicacion: {
      latitud: estacion.latitud,
      longitud: estacion.longitud,
    },
    // Compatible con el tablero existente. No presupone combustibles disponibles.
    combustibles: [
      { nombreComercial: "Sin precios registrados", precios: {} },
    ],
  };
}

/**
 * Coloca las 8 estaciones del archivo COORDENADAS.txt.
 * Usa el visor y el mapa de selección ya existentes en main.js.
 * No crea otro visor ni modifica cámara, imágenes, controles o estilos.
 */
export function colocarGasolinerasJalapa(visor, gasolinerasPorEntidad) {
  const ids = new Set();
  const idsApi = new Set();
  for (const estacion of GASOLINERAS_JALAPA) {
    if (ids.has(estacion.id)) {
      throw new Error(`Identificador repetido: ${estacion.id}`);
    }
    ids.add(estacion.id);
    if (estacion.idApi !== null) {
      const idApi = String(estacion.idApi);
      if (idsApi.has(idApi)) {
        throw new Error(`El registro API ${idApi} está vinculado a dos estaciones.`);
      }
      idsApi.add(idApi);
    }
    if (!Number.isFinite(estacion.latitud) || Math.abs(estacion.latitud) > 90 ||
        !Number.isFinite(estacion.longitud) || Math.abs(estacion.longitud) > 180 ||
        !Number.isFinite(estacion.rotacion) ||
        !Number.isFinite(estacion.escala) || estacion.escala <= 0) {
      throw new Error(`Posición o escala no válida: ${estacion.nombre}`);
    }
  }

  const entidades = new Map();
  for (const estacion of GASOLINERAS_JALAPA) {
    const idEntidad = `gasolinera-local-${estacion.id}`;
    // Solo sustituye entidades de este catálogo si se ejecuta nuevamente.
    const existente = visor.entities.getById(idEntidad);
    if (existente) visor.entities.remove(existente);

    // Cesium recibe LONGITUD primero y LATITUD después.
    const posicion = Cartesian3.fromDegrees(
      estacion.longitud,
      estacion.latitud,
      0,
    );
    const entidad = visor.entities.add({
      id: idEntidad,
      name: estacion.nombre,
      position: posicion,
      orientation: Transforms.headingPitchRollQuaternion(
        posicion,
        new HeadingPitchRoll(CesiumMath.toRadians(estacion.rotacion), 0, 0),
      ),
      model: {
        uri: `${import.meta.env.BASE_URL}models/${estacion.modelo}`,
        scale: estacion.escala,
        minimumPixelSize: 0,
        runAnimations: false,
        heightReference: HeightReference.CLAMP_TO_GROUND,
      },
      label: {
        text: estacion.nombre,
        font: "600 14px Arial",
        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 3,
        style: LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new Cartesian2(0, -38),
        verticalOrigin: VerticalOrigin.BOTTOM,
        heightReference: HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });
    entidades.set(estacion.id, entidad);
    gasolinerasPorEntidad.set(idEntidad, fichaSinPrecios(estacion));
  }
  visor.scene.requestRender();

  return {
    entidades,
    /**
     * La asociación exige el ID real en idApi del catálogo.
     * No asigna precios por marca, proximidad, orden de respuesta ni ID supuesto.
     * Mantiene nombre y coordenadas del archivo proporcionado por el usuario.
     */
    actualizarPrecios(gasolinerasApi) {
      if (!Array.isArray(gasolinerasApi)) {
        throw new Error("La API debe devolver un arreglo de gasolineras en data.");
      }
      const porId = new Map();
      for (const registro of gasolinerasApi) {
        if (registro?.id === undefined || registro?.id === null) continue;
        const id = String(registro.id);
        if (porId.has(id)) throw new Error(`ID repetido en la API: ${id}`);
        porId.set(id, registro);
      }
      let vinculadas = 0;
      for (const estacion of GASOLINERAS_JALAPA) {
        const ficha = fichaSinPrecios(estacion);
        const registro = estacion.idApi === null
          ? undefined
          : porId.get(String(estacion.idApi));
        if (registro && Array.isArray(registro.combustibles) && registro.combustibles.length) {
          ficha.combustibles = registro.combustibles;
          vinculadas += 1;
        }
        gasolinerasPorEntidad.set(`gasolinera-local-${estacion.id}`, ficha);
      }
      return { colocadas: entidades.size, conPrecios: vinculadas };
    },
  };
}
