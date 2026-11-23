// El foco del navegador es la selección visible y también sirve para Tab y lectores de pantalla.
const confirmar = new Set([
  "Enter",
  "NumpadEnter",
  "Space",
  "ShiftLeft",
  "ShiftRight",
]);
const direcciones = new Map([
  ["KeyW", "arriba"],
  ["ArrowUp", "arriba"],
  ["KeyS", "abajo"],
  ["ArrowDown", "abajo"],
  ["KeyA", "izquierda"],
  ["ArrowLeft", "izquierda"],
  ["KeyD", "derecha"],
  ["ArrowRight", "derecha"],
]);

/** @param {string} codigo */
export const esConfirmacion = (codigo) => confirmar.has(codigo);

/** Mueve el foco entre los controles visibles del panel o activa el seleccionado.
 * @param {KeyboardEvent} evento @param {HTMLElement} panel */
export function navegarPanel(evento, panel) {
  const direccion = direcciones.get(evento.code);
  if (!direccion && !esConfirmacion(evento.code)) return;
  const foco = document.activeElement;
  // El volumen se ajusta horizontalmente. Arriba y abajo permiten seguir recorriendo los ajustes.
  if (foco instanceof window.HTMLInputElement && foco.type === "range") {
    if (evento.code === "ArrowLeft" || evento.code === "ArrowRight") return; // comportamiento nativo
    if (evento.code === "KeyA" || evento.code === "KeyD") {
      evento.preventDefault();
      if (evento.code === "KeyA") foco.stepDown();
      else foco.stepUp();
      foco.dispatchEvent(new window.Event("input", { bubbles: true }));
      return;
    }
  }
  // En una lista desplegable las flechas, Enter y Espacio pertenecen al control nativo.
  if (
    foco instanceof window.HTMLSelectElement &&
    (evento.code.startsWith("Arrow") ||
      evento.code === "Enter" ||
      evento.code === "Space")
  )
    return;
  // Se consume también la repetición, para que una tecla sostenida no compre o confirme dos veces.
  evento.preventDefault();
  evento.stopPropagation();
  if (evento.repeat) return;

  const opciones = Array.from(
    panel.querySelectorAll(
      "button:enabled, a[href], input:enabled, select:enabled, summary",
    ),
  )
    .filter(
      (nodo) =>
        nodo instanceof window.HTMLElement && nodo.getClientRects().length > 0,
    )
    .map((nodo) => /** @type {HTMLElement} */ (nodo));
  if (!opciones.length) return;
  const actual = opciones.indexOf(
    /** @type {HTMLElement} */ (document.activeElement),
  );
  if (actual < 0) {
    if (direccion) opciones[0].focus(); // exige elegir una acción antes de confirmarla
    return;
  }
  if (!direccion) {
    opciones[actual].click(); // usa la misma acción y validaciones que el ratón
    return;
  }
  const avance = direccion === "derecha" || direccion === "abajo" ? 1 : -1;
  let proximo = (actual + avance + opciones.length) % opciones.length;
  if (direccion === "arriba" || direccion === "abajo") {
    // Busca primero la siguiente fila y dentro de ella la opción más alineada con la actual.
    const origen = opciones[actual].getBoundingClientRect();
    let mejorFila = Infinity;
    let mejorColumna = Infinity;
    opciones.forEach((opcion, indice) => {
      const caja = opcion.getBoundingClientRect();
      const salto =
        avance * (caja.top + caja.height / 2 - origen.top - origen.height / 2);
      if (salto < Math.min(origen.height, caja.height) / 2) return; // sigue en la misma fila o va al revés
      const lateral = Math.abs(
        caja.left + caja.width / 2 - origen.left - origen.width / 2,
      );
      if (
        salto < mejorFila - 2 ||
        (Math.abs(salto - mejorFila) <= 2 && lateral < mejorColumna)
      ) {
        mejorFila = salto;
        mejorColumna = lateral;
        proximo = indice;
      }
    });
  }
  opciones[proximo].focus(); // el navegador también desplaza el diálogo si el botón está fuera de vista
}
