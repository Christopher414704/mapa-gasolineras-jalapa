import path from "node:path";

import {
  fileURLToPath,
} from "node:url";

import { defineConfig } from "vite";

const archivoActual =
  fileURLToPath(import.meta.url);

const directorioActual =
  path.dirname(archivoActual);

const urlBaseCesium =
  "/node_modules/cesium/Build/Cesium/";

export default defineConfig({
  define: {
    CESIUM_BASE_URL: JSON.stringify(
      urlBaseCesium,
    ),
  },

  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    fs: {
      allow: [
        directorioActual,
        path.resolve(
          directorioActual,
          "node_modules",
        ),
      ],
    },
  },
});