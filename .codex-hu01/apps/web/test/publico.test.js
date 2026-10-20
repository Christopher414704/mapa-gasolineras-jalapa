import { test } from "node:test";
import assert from "node:assert/strict";
import { distanciaKm, urlGoogleMaps } from "../src/publico.js";

test("la distancia entre la ubicación del visitante y una estación se expresa en kilómetros", () => {
  const usuario = { latitud: 14.637, longitud: -89.99 };
  const cercana = { latitud: 14.63705, longitud: -89.99001 };
  const lejana = { latitud: 14.65, longitud: -89.98 };
  assert.equal(distanciaKm(usuario, usuario), 0);
  assert.ok(distanciaKm(usuario, cercana) < distanciaKm(usuario, lejana));
});

test("Google Maps recibe el destino y solicita navegación", () => {
  const url = new URL(urlGoogleMaps({ latitud: 14.63705, longitud: -89.99001 }));
  assert.equal(url.hostname, "www.google.com");
  assert.equal(url.pathname, "/maps/dir/");
  assert.equal(url.searchParams.get("api"), "1");
  assert.equal(url.searchParams.get("destination"), "14.63705,-89.99001");
  assert.equal(url.searchParams.get("travelmode"), "driving");
  assert.equal(url.searchParams.get("dir_action"), "navigate");
  assert.equal(urlGoogleMaps({ latitud: 200, longitud: 0 }), null);
});
