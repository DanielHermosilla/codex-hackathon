import { productos } from "../gameplay/tienda.js";
import { t } from "../i18n/index.js";
import "./tienda.css";

/** @param {number} cantidad */
export function textoMonedas(cantidad) {
  return t(cantidad === 1 ? "tienda.moneda" : "tienda.monedas", { cantidad });
}

/** @param {HTMLElement} contenedor
 * @param {() => ReturnType<typeof import("../gameplay/tienda.js").crearTienda>} tienda
 * @param {(id: import("../gameplay/tienda.js").Producto) => boolean} comprar
 * @param {() => void} alCerrar */
export function crearCarta(contenedor, tienda, comprar, alCerrar) {
  // El aviso vive en el trigal. El diálogo nativo ocupa la ventana y captura Tab y Escape.
  contenedor.innerHTML = `
    <div id="aviso-puesto" hidden role="status"><kbd>P</kbd> ${t("tienda.abrir")}</div>
    <dialog id="carta-productos" aria-labelledby="titulo-carta">
      <div class="carta-interior">
        <header class="carta-cabecera">
          <h2 id="titulo-carta">${t("tienda.titulo")}</h2>
          <form method="dialog"><button class="carta-volver" aria-label="${t("tienda.cerrar")}" title="${t("tienda.cerrar")}" autofocus>×</button></form>
        </header>
        <div class="carta-estado">
          <span class="carta-pausa"><i aria-hidden="true">Ⅱ</i>${t("tienda.pausa")}</span>
          <span class="carta-saldo" aria-live="polite"></span>
        </div>
        <p class="carta-nota">${t("tienda.nota")}</p>
        <ul class="carta-productos"></ul>
        <span role="status" class="sr"></span>
      </div>
    </dialog>`;
  const aviso = /** @type {HTMLElement} */ (
    contenedor.querySelector("#aviso-puesto")
  );
  const carta = /** @type {HTMLDialogElement} */ (
    contenedor.querySelector("dialog")
  );
  const saldo = /** @type {HTMLElement} */ (
    carta.querySelector(".carta-saldo")
  );
  const lista = /** @type {HTMLUListElement} */ (carta.querySelector("ul"));
  const confirmacion = /** @type {HTMLElement} */ (
    carta.querySelector('[role="status"]')
  );
  // Las ilustraciones son decorativas para el lector de pantalla: el nombre viene justo después.
  const filas = productos.map((id) => {
    const ficha = document.createElement("li");
    const nombre = t("tienda." + id);
    ficha.innerHTML = `<div class="carta-ilustracion"><img width="768" height="585" alt="" src="${import.meta.env.BASE_URL}atados/tienda/${id}.webp"></div>
      <div class="carta-detalle"><h3>${nombre}</h3><p>${t("tienda.efecto." + id)}</p>
      <button type="button"><span></span><b aria-hidden="true"></b></button></div>`;
    const boton = /** @type {HTMLButtonElement} */ (
      ficha.querySelector("button")
    );
    const etiqueta = /** @type {HTMLElement} */ (boton.querySelector("span"));
    const marca = /** @type {HTMLElement} */ (boton.querySelector("b"));
    function actualizar() {
      const vendido = tienda().vendido(id);
      const accion = t(vendido ? "tienda.comprado" : "tienda.comprar");
      const precio = tienda().cfg.tienda.precios[id];
      boton.disabled = vendido || tienda().saldo < precio;
      etiqueta.textContent = accion;
      marca.textContent = vendido ? "✓" : textoMonedas(precio);
      boton.setAttribute(
        "aria-label",
        vendido
          ? accion + " · " + nombre
          : accion + " · " + nombre + " · " + textoMonedas(precio),
      );
    }
    boton.onclick = () => {
      if (comprar(id))
        confirmacion.textContent = nombre + " · " + t("tienda.comprado");
      actualizarCarta();
    };
    lista.append(ficha);
    return actualizar;
  });

  // Al comprar se actualiza qué productos puede pagar la pareja con el saldo restante.
  function actualizarCarta() {
    saldo.textContent = textoMonedas(tienda().saldo);
    for (const actualizar of filas) actualizar();
  }
  carta.onclose = alCerrar;
  return {
    get abierta() {
      return carta.open;
    },
    abrir() {
      if (carta.open) return;
      actualizarCarta();
      confirmacion.textContent = "";
      aviso.hidden = true;
      carta.showModal();
    },
    cerrar() {
      if (carta.open) carta.close();
    },
    /** @param {{x:number,y:number,visible:boolean}} punto Coordenadas en píxeles del canvas. */
    situarAviso(punto) {
      aviso.hidden = !punto.visible;
      // CSS mantiene el aviso dentro de la arena aunque el techo quede junto al borde.
      aviso.style.setProperty("--puesto-x", Math.round(punto.x) + "px");
      aviso.style.setProperty("--puesto-y", Math.round(punto.y) + "px");
    },
    ocultarAviso() {
      if (!aviso.hidden) aviso.hidden = true;
    },
  };
}
