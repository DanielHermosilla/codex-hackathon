// El diálogo nativo retiene el foco y devuelve al jugador al engranaje al cerrar.
import { CONFIG } from "../core/config.js";
import {
  jugadores,
  acciones,
  teclasDe,
  cambiarTecla,
  guardarPreferencias,
} from "../core/preferencias.js";
import { etiquetaTecla } from "./hud-logica.js";
import { t } from "../i18n/index.js";

/** @param {HTMLDialogElement} panel
 * @param {ReturnType<typeof import('../core/preferencias.js').cargarPreferencias>} preferencias
 * @param {() => void} alCambiarVolumen @param {() => void} alCambiarTeclas */
export function prepararAjustes(
  panel,
  preferencias,
  alCambiarVolumen,
  alCambiarTeclas,
) {
  for (const nodo of panel.querySelectorAll("[data-texto]")) {
    nodo.textContent = t(nodo.getAttribute("data-texto") ?? "");
  }
  panel
    .querySelector("#close-settings")
    ?.setAttribute("aria-label", t("ajustes.cerrar"));
  const rango = /** @type {HTMLInputElement} */ (
    panel.querySelector("#volume")
  );
  const valor = /** @type {HTMLOutputElement} */ (
    panel.querySelector("output")
  );
  const estado = /** @type {HTMLElement} */ (
    panel.querySelector("#key-status")
  );
  const filas = /** @type {HTMLTableSectionElement} */ (
    panel.querySelector("tbody")
  );
  const restaurar = /** @type {HTMLButtonElement} */ (
    panel.querySelector("#reset-keys")
  );
  /** @type {{jugador: typeof jugadores[number], accion: typeof acciones[number], boton: HTMLButtonElement} | null} */
  let captura = null;
  /** @type {(() => void)[]} */
  const refrescos = [];

  // Cada fila muestra la misma acción de los dos jugadores para poder comparar sus teclas.
  for (const accion of acciones) {
    const fila = filas.insertRow();
    const nombre = t("ajustes." + accion);
    const encabezado = document.createElement("th");
    encabezado.scope = "row";
    encabezado.textContent = nombre;
    fila.append(encabezado);
    for (const jugador of jugadores) {
      const boton = document.createElement("button");
      boton.type = "button";
      const personaje = jugador === "sael" ? "Sael" : "Odo";
      const pintar = () => {
        const esperando = captura?.boton === boton;
        const etiqueta = etiquetaTecla(
          teclasDe(preferencias.teclado, jugador, accion)[0],
        );
        boton.textContent = esperando ? "…" : etiqueta;
        boton.setAttribute(
          "aria-label",
          [personaje, nombre, etiqueta].join(" · "),
        );
        boton.setAttribute("aria-pressed", String(esperando));
      };
      refrescos.push(pintar);
      boton.onclick = () => {
        captura = { jugador, accion, boton };
        actualizar(t("ajustes.captura"));
      };
      boton.onblur = () => {
        if (captura?.boton === boton) cancelar();
      };
      fila.insertCell().append(boton);
    }
  }

  /** @param {string} mensaje */
  function actualizar(mensaje) {
    for (const pintar of refrescos) pintar();
    estado.textContent = mensaje;
  }
  function cancelar() {
    captura = null;
    actualizar(t("ajustes.instruccion"));
  }
  panel.addEventListener("keydown", (e) => {
    if (!captura || e.key === "Tab") return;
    // Los atajos del sistema quedan disponibles y nunca se asignan al juego.
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.repeat) return;
    if (e.key === "Escape") return cancelar();
    const fallo = cambiarTecla(
      preferencias.teclado,
      captura.jugador,
      captura.accion,
      e.code,
    );
    if (fallo) return actualizar(t("ajustes." + fallo));
    alCambiarTeclas();
    guardarPreferencias(preferencias);
    captura = null;
    actualizar(t("ajustes.asignada", { tecla: etiquetaTecla(e.code) }));
  });
  restaurar.onclick = () => {
    Object.assign(
      preferencias.teclado,
      globalThis.structuredClone(CONFIG.controls.keyboard),
    );
    alCambiarTeclas();
    guardarPreferencias(preferencias);
    captura = null;
    actualizar(t("ajustes.restablecidas"));
  };
  // El deslizador muestra un porcentaje y el motor recibe una ganancia entre cero y uno.
  rango.value = String(Math.round(preferencias.volumen * 100));
  function mostrarVolumen() {
    valor.value = rango.value + " %";
    rango.style.setProperty("--nivel", rango.value + "%");
  }
  rango.oninput = () => {
    preferencias.volumen = rango.valueAsNumber / 100;
    mostrarVolumen();
    alCambiarVolumen();
    guardarPreferencias(preferencias);
  };
  mostrarVolumen();
  cancelar();
  panel.addEventListener("close", cancelar);
}
