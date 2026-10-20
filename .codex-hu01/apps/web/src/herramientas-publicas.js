const CLAVE_FAVORITOS = "leprices:favoritos:v1";
const NS = "http://www.w3.org/2000/svg";

function leerFavoritos() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE_FAVORITOS) ?? "[]");
    return Array.isArray(datos) ? datos.filter((d) => typeof d.codigo === "string" && typeof d.combustible === "string" && typeof d.modalidad === "string").slice(0, 50) : [];
  } catch { return []; }
}

function crearSvg(etiqueta, atributos = {}, contenido = "") {
  const nodo = document.createElementNS(NS, etiqueta);
  for (const [clave, valor] of Object.entries(atributos)) nodo.setAttribute(clave, String(valor));
  nodo.textContent = contenido;
  return nodo;
}

export function puntosHistorial(filas, ahora, dias) {
  const inicio = ahora - dias * 86400000;
  const ordenadas = filas.filter((r) => Number.isFinite(Number(r.precio)) && Number.isFinite(Date.parse(r.desde)))
    .sort((a, b) => Date.parse(a.desde) - Date.parse(b.desde));
  const vigenteAlInicio = ordenadas.find((r) => Date.parse(r.desde) <= inicio && (r.hasta == null || Date.parse(r.hasta) >= inicio));
  const puntos = vigenteAlInicio ? [{ fecha: inicio, precio: Number(vigenteAlInicio.precio) }] : [];
  for (const fila of ordenadas) {
    const fecha = Date.parse(fila.desde);
    if (fecha >= inicio && fecha <= ahora) puntos.push({ fecha, precio: Number(fila.precio) });
  }
  return puntos;
}

function dibujarGrafica(contenedor, filas, dias) {
  const ahora = Date.now();
  const puntos = puntosHistorial(filas, ahora, dias);
  contenedor.replaceChildren();
  if (!puntos.length) return false;
  const ancho = 560; const alto = 245; const izq = 54; const der = 16; const arriba = 18; const abajo = 37;
  const valores = puntos.map((p) => p.precio);
  const minimo = Math.floor((Math.min(...valores) - .25) * 2) / 2;
  const maximo = Math.ceil((Math.max(...valores) + .25) * 2) / 2;
  const primero = ahora - dias * 86400000;
  const x = (fecha) => izq + (Math.max(primero, Math.min(ahora, fecha)) - primero) / (ahora - primero) * (ancho - izq - der);
  const y = (precio) => arriba + (maximo - precio) / (maximo - minimo) * (alto - arriba - abajo);
  const svg = crearSvg("svg", { viewBox: `0 0 ${ancho} ${alto}`, "aria-hidden": "true" });
  for (let i = 0; i <= 4; i++) {
    const valor = minimo + (maximo - minimo) * i / 4;
    const yy = y(valor);
    svg.append(crearSvg("line", { x1: izq, y1: yy, x2: ancho - der, y2: yy, stroke: "#d9dde4" }),
      crearSvg("text", { x: izq - 8, y: yy + 4, "text-anchor": "end", fill: "#697482", "font-size": 11 }, `Q${valor.toFixed(2)}`));
  }
  let camino = `M ${x(puntos[0].fecha)} ${y(puntos[0].precio)}`;
  for (let i = 1; i < puntos.length; i++) camino += ` H ${x(puntos[i].fecha)} V ${y(puntos[i].precio)}`;
  camino += ` H ${x(ahora)}`;
  svg.append(crearSvg("path", { d: camino, fill: "none", stroke: "#cf1723", "stroke-width": 3, "stroke-linejoin": "round" }));
  for (const punto of puntos) svg.append(crearSvg("circle", { cx: x(punto.fecha), cy: y(punto.precio), r: 4, fill: "#cf1723", stroke: "white", "stroke-width": 2 }));
  const fecha = new Intl.DateTimeFormat("es-GT", { day: "numeric", month: "short", timeZone: "America/Guatemala" });
  for (const fraccion of [0, .5, 1]) {
    const f = primero + (ahora - primero) * fraccion;
    svg.append(crearSvg("text", { x: x(f), y: alto - 9, "text-anchor": fraccion === 0 ? "start" : fraccion === 1 ? "end" : "middle", fill: "#697482", "font-size": 11 }, fecha.format(f)));
  }
  contenedor.append(svg);
  contenedor.setAttribute("aria-label", `Gráfica de ${puntos.length} valores de precio entre Q${minimo.toFixed(2)} y Q${maximo.toFixed(2)}`);
  return true;
}

export function iniciarHerramientasPublicas({ urlApi, mostrarMensaje }) {
  const historial = document.querySelector("#dialogoHistorial");
  const favoritos = document.querySelector("#dialogoFavoritos");
  const selectorCombustible = document.querySelector("#combustibleHistorial");
  const selectorModalidad = document.querySelector("#modalidadHistorial");
  const selectorDias = document.querySelector("#diasHistorial");
  const mensajeHistorial = document.querySelector("#mensajeHistorial");
  const cambiosHistorial = document.querySelector("#cambiosHistorial");
  const grafica = document.querySelector("#graficaHistorial");
  const formulario = document.querySelector("#formularioFavorito");
  const listaFavoritos = document.querySelector("#listaFavoritos");
  const estadoFavoritos = document.querySelector("#estadoFavoritos");
  const activarAvisos = document.querySelector("#activarAvisos");
  const desactivarAvisos = document.querySelector("#desactivarAvisos");
  let clavePublica = null;
  let fichaHistorial = null;
  let fichaFavorita = null;
  let abortarHistorial;

  function claveComoBytes(clave) {
    const base64 = (clave + "=".repeat((4 - clave.length % 4) % 4)).replace(/-/g, "+").replace(/_/g, "/");
    return Uint8Array.from(atob(base64), (caracter) => caracter.charCodeAt(0));
  }

  async function prepararAvisos() {
    if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window) || !window.isSecureContext) {
      estadoFavoritos.textContent = "Los avisos requieren un navegador compatible y una conexión segura (HTTPS).";
      return;
    }
    try {
      const respuesta = await fetch(`${urlApi}/publico/alertas/configuracion`, { credentials: "omit", cache: "no-store" });
      const configuracion = await respuesta.json();
      clavePublica = configuracion.clavePublica;
      if (!configuracion.disponible) {
        estadoFavoritos.textContent = "Los avisos todavía no están configurados en este servidor; tus favoritos sí se guardan aquí.";
        return;
      }
      const registro = await navigator.serviceWorker.getRegistration();
      const suscripcion = await registro?.pushManager.getSubscription();
      activarAvisos.hidden = Boolean(suscripcion);
      desactivarAvisos.hidden = !suscripcion;
      estadoFavoritos.textContent = "";
    } catch { estadoFavoritos.textContent = "No pudimos comprobar si hay avisos disponibles."; }
  }

  activarAvisos.addEventListener("click", async () => {
    if (!leerFavoritos().length) { estadoFavoritos.textContent = "Guarda al menos un favorito para activar los avisos."; return; }
    try {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { estadoFavoritos.textContent = "No se activaron las notificaciones. Puedes permitirlas desde tu navegador."; return; }
      const registro = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}push-sw.js`);
      let suscripcion = await registro.pushManager.getSubscription();
      if (!suscripcion) suscripcion = await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveComoBytes(clavePublica) });
      await sincronizarAlertas();
      activarAvisos.hidden = true;
      desactivarAvisos.hidden = false;
      estadoFavoritos.textContent = "Avisos activados para tus combustibles favoritos cuando baje el precio.";
    } catch { estadoFavoritos.textContent = "No pudimos activar los avisos. Inténtalo de nuevo."; }
  });

  desactivarAvisos.addEventListener("click", async () => {
    try {
      const registro = await navigator.serviceWorker.getRegistration();
      const suscripcion = await registro?.pushManager.getSubscription();
      if (suscripcion) {
        const respuesta = await fetch(`${urlApi}/publico/alertas/suscripcion`, { method: "DELETE", credentials: "omit",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ suscripcion: suscripcion.toJSON() }) });
        if (!respuesta.ok) throw new Error("No se pudo cancelar la suscripción en el servidor.");
        await suscripcion.unsubscribe();
      }
      activarAvisos.hidden = false;
      desactivarAvisos.hidden = true;
      estadoFavoritos.textContent = "Avisos desactivados. Tus favoritos siguen guardados.";
    } catch { estadoFavoritos.textContent = "No pudimos desactivar los avisos. Inténtalo de nuevo."; }
  });

  for (const dialogo of [historial, favoritos]) {
    dialogo.querySelector("[data-cerrar-dialogo]").addEventListener("click", () => dialogo.close());
    dialogo.addEventListener("click", (evento) => { if (evento.target === dialogo) dialogo.close(); });
  }

  async function cargarHistorial() {
    if (!fichaHistorial || !selectorCombustible.value) return;
    abortarHistorial?.abort();
    abortarHistorial = new AbortController();
    mensajeHistorial.textContent = "Consultando cambios de precio…";
    grafica.replaceChildren();
    cambiosHistorial.replaceChildren();
    const parametros = new URLSearchParams({ combustible: selectorCombustible.value,
      modalidad: selectorModalidad.value, dias: selectorDias.value });
    try {
      const respuesta = await fetch(`${urlApi}/publico/gasolineras/${encodeURIComponent(fichaHistorial.codigo)}/historial?${parametros}`, {
        credentials: "omit", signal: abortarHistorial.signal,
      });
      if (!respuesta.ok) throw new Error("No fue posible consultar el historial.");
      const { data } = await respuesta.json();
      const cambios = data.filter((r) => Date.parse(r.desde) >= Date.now() - Number(selectorDias.value) * 86400000);
      mensajeHistorial.textContent = !data.length ? "Todavía no hay precios registrados para esta combinación." :
        cambios.length < 2 ? "Hay pocos cambios registrados en este período. La línea muestra el precio conocido, sin inventar datos anteriores." :
          `${cambios.length} cambios registrados en este período.`;
      dibujarGrafica(grafica, data, Number(selectorDias.value));
      for (const fila of cambios.slice().reverse()) {
        const li = document.createElement("li");
        li.textContent = `${new Intl.DateTimeFormat("es-GT", { timeZone: "America/Guatemala", dateStyle: "medium", timeStyle: "short" }).format(new Date(fila.desde))}: Q${Number(fila.precio).toFixed(2)} por ${fila.unidadMedida === "galon" ? "galón" : fila.unidadMedida}`;
        cambiosHistorial.append(li);
      }
    } catch (error) { if (error.name !== "AbortError") mensajeHistorial.textContent = error.message; }
  }
  for (const selector of [selectorCombustible, selectorModalidad, selectorDias]) selector.addEventListener("change", cargarHistorial);

  function mostrarHistorial(ficha) {
    fichaHistorial = ficha;
    document.querySelector("#estacionHistorial").textContent = `${ficha.nombre} · ${ficha.municipio}, ${ficha.departamento}`;
    selectorCombustible.replaceChildren();
    for (const c of ficha.combustibles) selectorCombustible.append(new Option(c.nombre ?? c.nombreComercial, c.codigo ?? c.tipo?.codigo));
    historial.showModal();
    cargarHistorial();
  }

  function renderFavoritos() {
    listaFavoritos.replaceChildren();
    const guardados = leerFavoritos();
    if (!guardados.length) estadoFavoritos.textContent = "Aún no has guardado combustibles favoritos.";
    else estadoFavoritos.textContent = "";
    for (const item of guardados) {
      const li = document.createElement("li");
      const titulo = document.createElement("strong");
      titulo.textContent = `${item.nombre} · ${item.combustibleNombre} · ${item.modalidad === "autoservicio" ? "Autoservicio" : "Servicio Completo"}`;
      li.append(titulo);
      if (item.objetivo) {
        const objetivo = document.createElement("span");
        objetivo.textContent = `Avisar a Q${Number(item.objetivo).toFixed(2)}`;
        li.append(objetivo);
      }
      const quitar = document.createElement("button");
      quitar.type = "button";
      quitar.textContent = "Quitar";
      quitar.addEventListener("click", async () => {
        localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(leerFavoritos().filter((f) => f.clave !== item.clave)));
        await sincronizarAlertas();
        renderFavoritos();
      });
      li.append(quitar);
      listaFavoritos.append(li);
    }
  }

  async function sincronizarAlertas() {
    // La suscripción se registra solo después de que la persona active las notificaciones.
    if (!("Notification" in window) || Notification.permission !== "granted" || !navigator.serviceWorker) return;
    const registro = await navigator.serviceWorker.getRegistration();
    const suscripcion = await registro?.pushManager.getSubscription();
    if (!suscripcion) return;
    const respuesta = await fetch(`${urlApi}/publico/alertas/suscripcion`, {
      method: "PUT", credentials: "omit", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suscripcion: suscripcion.toJSON(), favoritos: leerFavoritos().map((f) => ({
        codigo: f.codigo, combustible: f.combustible, modalidad: f.modalidad, objetivo: f.objetivo,
      })) }),
    });
    if (!respuesta.ok) throw new Error("No pudimos actualizar tus avisos.");
  }

  formulario.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    const combustible = document.querySelector("#combustibleFavorito");
    const modalidad = document.querySelector("#modalidadFavorito").value;
    const objetivo = document.querySelector("#precioObjetivo").value;
    const codigo = fichaFavorita.codigo;
    const clave = `${codigo}:${combustible.value}:${modalidad}`;
    const item = { clave, codigo, nombre: fichaFavorita.nombre,
      combustible: combustible.value, combustibleNombre: combustible.selectedOptions[0]?.textContent,
      modalidad, objetivo: objetivo || null };
    const guardados = leerFavoritos().filter((f) => f.clave !== clave);
    guardados.unshift(item);
    localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(guardados.slice(0, 50)));
    renderFavoritos();
    formulario.hidden = true;
    try { await sincronizarAlertas(); } catch (error) { estadoFavoritos.textContent = error.message; }
    mostrarMensaje("Combustible guardado en tus favoritos.");
  });

  document.querySelector("#misFavoritos").addEventListener("click", () => {
    formulario.hidden = true;
    renderFavoritos();
    prepararAvisos();
    favoritos.showModal();
  });

  function alternarFavorito(ficha) {
    fichaFavorita = ficha;
    document.querySelector("#estacionFavorito").textContent = `${ficha.nombre} · ${ficha.municipio}`;
    const selector = document.querySelector("#combustibleFavorito");
    selector.replaceChildren();
    for (const c of ficha.combustibles) selector.append(new Option(c.nombre ?? c.nombreComercial, c.codigo ?? c.tipo?.codigo));
    if (!selector.options.length) { mostrarMensaje("Esta estación aún no tiene combustibles publicados."); return; }
    formulario.hidden = false;
    renderFavoritos();
    prepararAvisos();
    favoritos.showModal();
  }

  return { mostrarHistorial, alternarFavorito };
}
