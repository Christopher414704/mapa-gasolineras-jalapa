import {
  ArcGisMapServerImageryProvider,
  Cartesian2,
  Cartesian3,
  Color,
  HeadingPitchRoll,
  HeightReference,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  Transforms,
  VerticalOrigin,
  Viewer,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";


const urlApi =
  import.meta.env.VITE_API_URL
  ?? "http://localhost:3000/api";

const urlMapaEsri =
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer";

const elementoEstado =
  document.querySelector("#estadoMapa");

const elementoTablero =
  document.querySelector("#tableroPrecios");

const gasolinerasPorEntidad = new Map();

/*
 * Diez ubicaciones: COORDENADAS.txt, la Shell adicional y Texaco Centro.
 * idApi queda en null hasta conocer el ID real de cada sucursal.
 * rotacion (grados) y escala son ajustes visuales por gasolinera.
 * La orientación inicial es provisional; no se deduce de la coordenada.
 */

const gasolinerasJalapa = [
  {
    id: "texaco-centro",
    idApi: null,
    nombre: "Gasolinera Texaco Centro",
    marca: { nombre: "Texaco", colorPrincipal: "#D71920" },
    ubicacion: {
      longitud: -89.99001385896233,
      latitud: 14.637050001434654,
    },
    modelo: "/models/gasolinera-texaco.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "shell-adicional",
    idApi: null,
    nombre: "Gasolinera Shell Salida/Pinula",
    marca: { nombre: "Shell", colorPrincipal: "#FDC900" },
    ubicacion: {
      longitud: -89.9700594838229,
      latitud: 14.649729963223635,
    },
    modelo: "/models/gasolinera-shell.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "shell-metroplaza",
    idApi: null,
    nombre: "Gasolinera Shell Metroplaza",
    marca: { nombre: "Shell", colorPrincipal: "#FDC900" },
    ubicacion: {
      longitud: -89.99983333333333,
      latitud: 14.651333333333334,
    },
    modelo: "/models/gasolinera-shell.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "shell-centro",
    idApi: null,
    nombre: "Gasolinera Shell Centro",
    marca: { nombre: "Shell", colorPrincipal: "#FDC900" },
    ubicacion: {
      longitud: -89.98436111111111,
      latitud: 14.637611111111111,
    },
    modelo: "/models/gasolinera-shell.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "shell-calzada",
    idApi: null,
    nombre: "Gasolinera Shell Calzada",
    marca: { nombre: "Shell", colorPrincipal: "#FDC900" },
    ubicacion: {
      longitud: -89.97888888888889,
      latitud: 14.629944444444446,
    },
    modelo: "/models/gasolinera-shell.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "uno-centro",
    idApi: null,
    nombre: "Gasolinera UNO Centro",
    marca: { nombre: "UNO", colorPrincipal: "#005EB8" },
    ubicacion: {
      longitud: -89.98508333333334,
      latitud: 14.632055555555556,
    },
    modelo: "/models/gasolinera-uno.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "uno-estadio",
    idApi: null,
    nombre: "Gasolinera UNO Estadio",
    marca: { nombre: "UNO", colorPrincipal: "#005EB8" },
    ubicacion: {
      longitud: -89.9876388888889,
      latitud: 14.638666666666666,
    },
    modelo: "/models/gasolinera-uno.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "puma-salida-monjas",
    idApi: null,
    nombre: "Gasolinera Puma Salida/Monjas",
    marca: { nombre: "Puma", colorPrincipal: "#007C45" },
    ubicacion: {
      longitud: -89.97341666666667,
      latitud: 14.615916666666667,
    },
    modelo: "/models/gasolinera-puma.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "puma-centro",
    idApi: null,
    nombre: "Gasolinera Puma Centro",
    marca: { nombre: "Puma", colorPrincipal: "#007C45" },
    ubicacion: {
      longitud: -89.98871147299016,
      latitud: 14.632058854692447,
    },
    modelo: "/models/gasolinera-puma.glb",
    rotacion: 0,
    escala: 1,
  },
  {
    id: "la-montana",
    idApi: null,
    nombre: "Gasolinera La Montaña",
    marca: { nombre: "La Montaña", colorPrincipal: "#386C4B" },
    ubicacion: {
      longitud: -89.99138888888889,
      latitud: 14.63125,
    },
    modelo: "/models/gasolinera-la-montana.glb",
    rotacion: 0,
    escala: 1,
  },
];


/*
 * Visor sin terreno, edificios ni capa predeterminada.
 * La escena permanece en 3D para mostrar los modelos GLB.
 */

const visor = new Viewer(
  "cesiumContainer",
  {
    baseLayer: false,
    baseLayerPicker: false,
    animation: false,
    timeline: false,
    geocoder: false,
    homeButton: false,
    sceneModePicker: false,
    navigationHelpButton: false,
    fullscreenButton: false,
    infoBox: false,
    selectionIndicator: false,
    scene3DOnly: true,

    requestRenderMode: true,

    maximumRenderTimeChange:
      Number.POSITIVE_INFINITY,
  },
);


/*
 * Configuración visual del mapa.
 */

visor.scene.globe.enableLighting = false;

visor.scene.globe.depthTestAgainstTerrain =
  false;

visor.scene.globe.baseColor =
  Color.fromCssColorString("#07111f");

visor.scene.fog.enabled = false;

visor.scene.skyAtmosphere.show = false;

visor.scene.screenSpaceCameraController
  .minimumZoomDistance = 25;

visor.scene.screenSpaceCameraController
  .maximumZoomDistance = 12000;

visor.scene.screenSpaceCameraController
  .enableCollisionDetection = true;

/*
 * Vista inicial sobre Jalapa.
 * La cámara queda inclinada para distinguir
 * las gasolineras 3D sobre el mapa 2D.
 */

visor.camera.setView({
  destination: Cartesian3.fromDegrees(
    -89.9887,
    14.6349,
    2400,
  ),

  orientation: {
    heading: CesiumMath.toRadians(0),
    pitch: CesiumMath.toRadians(-43),
    roll: 0,
  },
});

/*
 * Carga de Esri World Imagery.
 */

async function cargarMapaSatelital() {
  try {
    const proveedorEsri =
      await ArcGisMapServerImageryProvider
        .fromUrl(
          urlMapaEsri,
          {
            enablePickFeatures: false,
          },
        );

    const capaEsri =
      new ImageryLayer(
        proveedorEsri,
      );

    /*
     * Pequeños ajustes para mejorar
     * claridad y color.
     */

    capaEsri.brightness = 1;
    capaEsri.contrast = 1.06;
    capaEsri.saturation = 1.04;
    capaEsri.gamma = 1;

    visor.imageryLayers.add(
      capaEsri,
      0,
    );
  } catch (error) {
    console.error(
      "No fue posible cargar Esri World Imagery:",
      error,
    );

    elementoEstado.textContent =
      "No fue posible cargar el mapa satelital.";

    elementoEstado.classList.add(
      "estado--error",
    );
  }
}

function obtenerColorGasolinera(
  gasolinera,
) {
  const color =
    gasolinera.marca?.colorPrincipal;

  return Color.fromCssColorString(
    color || "#22c55e",
  );
}

/*
 * Agrega la gasolinera como modelo GLB.
 */

function agregarGasolineraAlMapa(
  gasolinera,
) {
  const idEntidad =
    `gasolinera-${gasolinera.id}`;

  const posicion =
    Cartesian3.fromDegrees(
      gasolinera.ubicacion.longitud,
      gasolinera.ubicacion.latitud,
      0,
    );

  const orientacion =
    Transforms.headingPitchRollQuaternion(
      posicion,

      new HeadingPitchRoll(
        CesiumMath.toRadians(gasolinera.rotacion ?? 0),
        0,
        0,
      ),
    );

  const entidad =
    visor.entities.add({
      id: idEntidad,
      name: gasolinera.nombre,
      position: posicion,
      orientation: orientacion,

      model: {
        uri:
          gasolinera.modelo,

        scale: gasolinera.escala ?? 1,

        minimumPixelSize: 54,
        maximumScale: 3,

        heightReference:
          HeightReference.CLAMP_TO_GROUND,

        silhouetteColor:
          obtenerColorGasolinera(
            gasolinera,
          ),

        silhouetteSize: 1,
      },

      label: {
        text: gasolinera.nombre,
        font: "600 16px Arial",

        fillColor: Color.WHITE,
        outlineColor: Color.BLACK,
        outlineWidth: 4,

        style:
          LabelStyle.FILL_AND_OUTLINE,

        pixelOffset:
          new Cartesian2(
            0,
            -72,
          ),

        verticalOrigin:
          VerticalOrigin.BOTTOM,

        heightReference:
          HeightReference.CLAMP_TO_GROUND,

        disableDepthTestDistance:
          Number.POSITIVE_INFINITY,
      },
    });

  gasolinerasPorEntidad.set(
    entidad.id,
    gasolinera,
  );
}

function crearFilaPrecio(
  combustible,
  codigoModalidad,
) {
  const fila =
    document.createElement("div");

  fila.className = "fila-precio";

  const nombre =
    document.createElement("span");

  nombre.className =
    "nombre-combustible";

  nombre.textContent =
    combustible.nombreComercial;

  const celdaPrecio =
    document.createElement("div");

  celdaPrecio.className =
    "celda-precio";

  const simboloMoneda =
    document.createElement("span");

  simboloMoneda.className =
    "simbolo-moneda";

  simboloMoneda.textContent = "Q";

  const precio =
    document.createElement("strong");

  precio.className =
    "precio-digital";

  const informacionPrecio =
    combustible.precios?.[
      codigoModalidad
    ];

  const valor =
    Number(
      informacionPrecio?.precio,
    );

  precio.textContent =
    Number.isFinite(valor)
      ? valor.toFixed(2)
      : "--.--";

  celdaPrecio.append(
    simboloMoneda,
    precio,
  );

  fila.append(
    nombre,
    celdaPrecio,
  );

  return fila;
}

function crearColumnaModalidad(
  titulo,
  codigo,
  combustibles,
) {
  const columna =
    document.createElement("section");

  columna.className =
    "columna-modalidad";

  const encabezado =
    document.createElement("h3");

  encabezado.textContent = titulo;

  const encabezadoCampos =
    document.createElement("div");

  encabezadoCampos.className =
    "encabezado-campos";

  const tipo =
    document.createElement("span");

  tipo.textContent =
    "Tipo de gasolina";

  const precio =
    document.createElement("span");

  precio.textContent = "Precio";

  encabezadoCampos.append(
    tipo,
    precio,
  );

  columna.append(
    encabezado,
    encabezadoCampos,
  );

  combustibles.forEach(
    (combustible) => {
      columna.append(
        crearFilaPrecio(
          combustible,
          codigo,
        ),
      );
    },
  );

  return columna;
}

function construirTablero(
  gasolinera,
) {

  const colorMarca =
  gasolinera.marca?.colorPrincipal
  || "#22c55e";

elementoTablero.style.setProperty(
  "--color-marca",
  colorMarca,
);
  const encabezado =
    document.createElement("div");

  encabezado.className =
    "encabezado-tablero";

  const nombre =
    document.createElement("h2");

  nombre.textContent =
    gasolinera.nombre;

  const moneda =
    document.createElement("span");

  encabezado.append(
    nombre
  );

  const contenido =
    document.createElement("div");

  contenido.className =
    "contenido-tablero";

  contenido.append(
    crearColumnaModalidad(
      "Autoservicio",
      "autoservicio",
      gasolinera.combustibles,
    ),

    crearColumnaModalidad(
      "Manual",
      "servicio_manual",
      gasolinera.combustibles,
    ),
  );

  elementoTablero.replaceChildren(
    encabezado,
    contenido,
  );
}

function posicionarTablero(
  posicion,
) {
  const separacion = 22;
  const margen = 12;

  let izquierda =
    posicion.x + separacion;

  let superior =
    posicion.y + separacion;

  const ancho =
    elementoTablero.offsetWidth;

  const alto =
    elementoTablero.offsetHeight;

  if (
    izquierda + ancho
    > window.innerWidth - margen
  ) {
    izquierda =
      posicion.x
      - ancho
      - separacion;
  }

  if (
    superior + alto
    > window.innerHeight - margen
  ) {
    superior =
      window.innerHeight
      - alto
      - margen;
  }

  izquierda = Math.max(
    margen,
    izquierda,
  );

  superior = Math.max(
    110,
    superior,
  );

  elementoTablero.style.left =
    `${izquierda}px`;

  elementoTablero.style.top =
    `${superior}px`;
}

function mostrarTablero(
  gasolinera,
) {
  construirTablero(
    gasolinera,
  );

  elementoTablero.hidden = false;

  visor.scene.canvas.style.cursor =
    "pointer";
}

function ocultarTablero() {
  elementoTablero.hidden = true;

  visor.scene.canvas.style.cursor =
    "default";
}

/*
 * Detectar el cursor sobre una gasolinera.
 */

const manejadorEventos =
  new ScreenSpaceEventHandler(
    visor.scene.canvas,
  );

manejadorEventos.setInputAction(
  (movimiento) => {
    const elementoSeleccionado =
      visor.scene.pick(
        movimiento.endPosition,
      );

    const idEntidad =
      elementoSeleccionado?.id?.id;

    const gasolinera =
      gasolinerasPorEntidad.get(
        idEntidad,
      );

    if (!gasolinera) {
      ocultarTablero();
      return;
    }

    mostrarTablero(
      gasolinera,
      movimiento.endPosition,
    );
  },

  ScreenSpaceEventType.MOUSE_MOVE,
);

/*
 * Ficha inicial para el tablero: no copia precios de la gasolinera demo.
 */

function crearFichaGasolinera(estacion) {
  return {
    ...estacion,
    combustibles: [
      {
        nombreComercial: "Sin precios registrados",
        precios: {},
      },
    ],
  };
}

function actualizarPreciosGasolineras(registros) {
  if (!Array.isArray(registros)) {
    throw new Error("La API no devolvió una lista de gasolineras en data.");
  }

  const registrosPorId = new Map();
  for (const registro of registros) {
    if (registro?.id == null) continue;
    const id = String(registro.id);
    if (registrosPorId.has(id)) {
      throw new Error(`ID repetido en la API: ${id}`);
    }
    registrosPorId.set(id, registro);
  }

  // Validar los vínculos antes de asignar precios a alguna sucursal.
  const idsVinculados = new Set();
  for (const estacion of gasolinerasJalapa) {
    if (estacion.idApi == null) continue;
    const id = String(estacion.idApi);
    if (idsVinculados.has(id)) {
      throw new Error(`El ID de API ${id} está asignado a dos sucursales.`);
    }
    idsVinculados.add(id);
  }

  for (const estacion of gasolinerasJalapa) {
    const ficha = crearFichaGasolinera(estacion);
    const registro = estacion.idApi == null
      ? undefined
      : registrosPorId.get(String(estacion.idApi));

    if (Array.isArray(registro?.combustibles) && registro.combustibles.length) {
      ficha.combustibles = registro.combustibles;
    }

    gasolinerasPorEntidad.set(`gasolinera-${estacion.id}`, ficha);
  }
}

/*
 * Colocar las gasolineras y consultar sus precios en la API.
 */

async function cargarGasolineras() {
  // Los modelos aparecen incluso si la API está temporalmente sin conexión.
  for (const estacion of gasolinerasJalapa) {
    const ficha = crearFichaGasolinera(estacion);
    const idEntidad = `gasolinera-${estacion.id}`;

    if (!visor.entities.getById(idEntidad)) {
      agregarGasolineraAlMapa(ficha);
    } else {
      gasolinerasPorEntidad.set(idEntidad, ficha);
    }
  }
  visor.scene.requestRender();

  try {
    elementoEstado.textContent =
      "Consultando precios...";

    elementoEstado.classList.remove(
      "estado--error",
    );

    const respuesta =
      await fetch(
        `${urlApi}/gasolineras`,
      );

    if (!respuesta.ok) {
      throw new Error(
        `La API respondió con estado ${respuesta.status}.`,
      );
    }

    const resultado =
      await respuesta.json();

    actualizarPreciosGasolineras(resultado.data);

    const descripcion =
      gasolinerasJalapa.length === 1
        ? "gasolinera cargada"
        : "gasolineras cargadas";

    elementoEstado.textContent =
      `${gasolinerasJalapa.length} ${descripcion}`;
  } catch (error) {
    console.error(error);

    elementoEstado.textContent =
      "No fue posible consultar los precios.";

    elementoEstado.classList.add(
      "estado--error",
    );
  }
}

/*
 * Iniciar mapa y API simultáneamente.
 */

async function iniciarAplicacion() {
  await cargarMapaSatelital();
  await cargarGasolineras();
}

iniciarAplicacion();