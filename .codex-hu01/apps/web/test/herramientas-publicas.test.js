import { test } from "node:test";
import assert from "node:assert/strict";
import { puntosHistorial } from "../src/herramientas-publicas.js";

test("la gráfica usa el precio vigente al inicio y cambios reales, sin inventar otros", () => {
  const ahora = Date.parse("2026-09-22T12:00:00Z");
  const filas = [
    { desde: "2026-07-01T12:00:00Z", hasta: "2026-09-10T12:00:00Z", precio: 32 },
    { desde: "2026-09-10T12:00:00Z", hasta: null, precio: 30 },
  ];
  const puntos = puntosHistorial(filas, ahora, 30);
  assert.equal(puntos.length, 2);
  assert.equal(puntos[0].precio, 32);
  assert.equal(puntos[1].precio, 30);
  assert.equal(puntos[1].fecha, Date.parse("2026-09-10T12:00:00Z"));
});
