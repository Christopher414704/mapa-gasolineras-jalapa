import {
  Cartesian2,
  Cartesian3,
  Color,
  ImageryLayer,
  LabelStyle,
  Math as CesiumMath,
  OpenStreetMapImageryProvider,
  VerticalOrigin,
  Viewer,
} from "cesium";

import "cesium/Build/Cesium/Widgets/widgets.css";
import "./style.css";

const urlApi =
  import.meta.env.VITE_API_URL
  ?? "http://localhost:3000/api";

const elementoEstado =
  document.querySelector("#estadoMapa");

const capaOpenStreetMap = new ImageryLayer(
  new OpenStreetMapImageryProvider({
    url: "https://tile.openstreetmap.org/",
  }),
);

const visor = new Viewer(
  "cesiumContainer",
  {
    baseLayerPicker: false,
    baseLayer: capaOpenStreetMap,
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
  },
);

visor.scene.globe.enableLighting = true;

visor.camera.setView({
  destination: Cartesian3.fromDegrees(
    -89.9887,
    14.6349,
    6000,
  ),

  orientation: {
    heading: CesiumMath.toRadians(0),
    pitch: CesiumMath.toRadians(-45),
    roll: 0,
  },
});

function obtenerColorGasolinera(gasolinera) {
  const color =
    gasolinera.marca.colorPrincipal;

  if (!color) {
    return Color.fromCssColorString(
      "#22c55e",
    );
  }

  return Color.fromCssColorString(color);
}

function agregarGasolineraAlMapa(gasolinera) {
  visor.entities.add({
    id: `gasolinera-${gasolinera.id}`,
    name: gasolinera.nombre,

    position: Cartesian3.fromDegrees(
      gasolinera.ubicacion.longitud,
      gasolinera.ubicacion.latitud,
      20,
    ),

    point: {
      pixelSize: 18,
      color: obtenerColorGasolinera(
        gasolinera,
      ),
      outlineColor: Color.WHITE,
      outlineWidth: 3,

      disableDepthTestDistance:
        Number.POSITIVE_INFINITY,
    },

    label: {
      text: gasolinera.nombre,
      font: "600 16px Arial",
      fillColor: Color.WHITE,
      outlineColor: Color.BLACK,
      outlineWidth: 4,
      style: LabelStyle.FILL_AND_OUTLINE,

      pixelOffset: new Cartesian2(
        0,
        -28,
      ),

      verticalOrigin:
        VerticalOrigin.BOTTOM,

      disableDepthTestDistance:
        Number.POSITIVE_INFINITY,
    },

    properties: {
      tipo: "gasolinera",
      codigo: gasolinera.codigo,
    },
  });
}

async function cargarGasolineras() {
  try {
    elementoEstado.textContent =
      "Consultando precios...";

    const respuesta = await fetch(
      `${urlApi}/gasolineras`,
    );

    if (!respuesta.ok) {
      throw new Error(
        `La API respondió con estado ${respuesta.status}.`,
      );
    }

    const resultado = await respuesta.json();

    resultado.data.forEach(
      agregarGasolineraAlMapa,
    );

    elementoEstado.textContent =
      `${resultado.total} gasolinera cargada`;
  } catch (error) {
    console.error(error);

    elementoEstado.textContent =
      "No fue posible cargar las gasolineras.";

    elementoEstado.classList.add(
      "estado--error",
    );
  }
}

cargarGasolineras();