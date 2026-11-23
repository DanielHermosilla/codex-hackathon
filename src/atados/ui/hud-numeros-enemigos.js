// Números de daño de los enemigos del pasillo (D-080, D-166, D-209): al cerrar un corte, gameplay emite
// `enemigo:herido {id, dano}` con el daño agrupado del corte; aquí sale un número sobre ese enemigo que sube un
// poco y se apaga. Mismo estilo y tamaño que el número del jefe (hud-numeros.js, CONFIG.hud.numeroDano) y la
// misma opción para desactivarlo (`numeroDano.activo`). Pool fijo de elementos: nada se crea por cuadro.
// La parte pura (estado del pool) va separada del DOM para poder probarla sin navegador.
import { formatoNumero, tamanoNumero } from "./hud-logica.js";

/** @typedef {import('./hud-logica.js').Config} Config */
/** @typedef {import('../gameplay/tipos.js').EnemigoVista} EnemigoVista */
/** Un número en pantalla: dónde salió (m), cuánto daño y `t` s desde que salió. @typedef {{ activo: boolean, x: number, z: number, dano: number, t: number }} NumeroEnemigo */
/** Evento que puede traer un número: solo cuenta `enemigo:herido`. @typedef {{ tipo?: string, id?: unknown, dano?: unknown }} EventoNumero */

export const ESTILOS_NUMEROS_ENEMIGOS = `
.hud .numero-enemigo{position:absolute;transform:translate(-50%,-100%);font:700 16px/1 'Cinzel',Georgia,serif;color:var(--texto);
  -webkit-text-stroke:.14em var(--fondo);paint-order:stroke fill;text-shadow:0 .06em .1em var(--fondo);white-space:nowrap;}
`;

/**
 * Pool vacío de `n` números (n = CONFIG.hud.numeroEnemigo.pool).
 * @param {number} n
 * @returns {NumeroEnemigo[]}
 */
export function nuevosNumerosEnemigos(n) {
  return Array.from({ length: n }, () => ({
    activo: false,
    x: 0,
    z: 0,
    dano: 0,
    t: 0,
  }));
}

/**
 * Aplica un evento: con `enemigo:herido` ocupa un hueco libre (o el número más viejo si no hay) sobre el enemigo.
 * Devuelve true si salió un número.
 * @param {NumeroEnemigo[]} pool
 * @param {EventoNumero | null | undefined} ev
 * @param {readonly EnemigoVista[]} enemigos
 * @param {Config} cfg
 */
export function aplicarHeridoEnemigo(pool, ev, enemigos, cfg) {
  if (ev?.tipo !== "enemigo:herido" || !pool.length) return false;
  const N = cfg.hud.numeroDano;
  const dano = Number(ev.dano);
  if (!N.activo || !(dano >= N.valorMin)) return false; // desactivado o golpe demasiado chico
  const e = enemigos.find((x) => x.id === ev.id);
  if (!e) return false; // el enemigo ya no está (pasillo reiniciado)
  let hueco = pool[0];
  for (const n of pool) {
    if (!n.activo) {
      hueco = n;
      break;
    }
    if (n.t > hueco.t) hueco = n; // todos ocupados: se reutiliza el más viejo
  }
  hueco.activo = true;
  hueco.x = e.x;
  hueco.z = e.z;
  hueco.dano = dano;
  hueco.t = 0;
  return true;
}

/**
 * Avanza el tiempo de los números y libera los que ya se apagaron.
 * @param {NumeroEnemigo[]} pool
 * @param {number} dt  s
 * @param {Config} cfg
 */
export function avanzarNumerosEnemigos(pool, dt, cfg) {
  const D = cfg.hud.numeroEnemigo.duracion;
  for (const n of pool) {
    if (!n.activo) continue;
    n.t += dt;
    if (n.t >= D) n.activo = false;
  }
}

/**
 * Cómo se ve un número: opacidad 0..1 (se apaga en el último `fundido` s), m que ya subió y px de letra.
 * @param {NumeroEnemigo} n
 * @param {Config} cfg
 * @param {{ opacidad: number, subida: number, tamano: number }} out  objeto reutilizado
 */
export function vistaNumeroEnemigo(n, cfg, out) {
  const E = cfg.hud.numeroEnemigo;
  const k = Math.min(1, n.t / E.duracion); // 0..1 de su vida
  const resta = E.duracion - n.t; // s que le quedan
  out.opacidad =
    E.fundido > 0 ? Math.min(1, Math.max(0, resta / E.fundido)) : 1;
  out.subida = E.subida * (1 - (1 - k) * (1 - k)); // frena al final (cuadrática de salida)
  out.tamano = tamanoNumero(n.dano, cfg.hud.numeroDano) * E.escala;
  return out;
}

/**
 * Capa DOM de los números de los enemigos.
 * @param {object} deps
 * @param {Config} deps.cfg
 * @param {HTMLElement} deps.parent
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 * @param {() => readonly EnemigoVista[]} deps.getEnemigos
 * @param {(x: number, z: number) => number} deps.alturaSuelo  m del suelo visual (la subida es solo dibujo, D-210)
 */
export function crearHudNumerosEnemigos({
  cfg,
  parent,
  toScreen,
  getEnemigos,
  alturaSuelo,
}) {
  const pool = nuevosNumerosEnemigos(cfg.hud.numeroEnemigo.pool);
  const els = pool.map(() => {
    const el = document.createElement("div");
    el.className = "numero-enemigo oculto";
    parent.appendChild(el);
    return el;
  });
  const textos = pool.map(() => ""); // último texto escrito en cada elemento (no tocar el DOM si no cambió)
  const pos = { x: 0, y: 0, visible: false };
  const vista = { opacidad: 0, subida: 0, tamano: 0 };
  return {
    /** @param {EventoNumero} ev */
    alEvento(ev) {
      aplicarHeridoEnemigo(pool, ev, getEnemigos(), cfg);
    },
    /** @param {number} dt */
    update(dt) {
      avanzarNumerosEnemigos(pool, dt, cfg);
      const E = cfg.hud.numeroEnemigo;
      for (let i = 0; i < pool.length; i++) {
        const n = pool[i],
          el = els[i];
        if (!n.activo) {
          if (!el.classList.contains("oculto")) el.classList.add("oculto");
          continue;
        }
        vistaNumeroEnemigo(n, cfg, vista);
        toScreen(
          n.x,
          alturaSuelo(n.x, n.z) + E.altura + vista.subida,
          n.z,
          pos,
        );
        el.classList.toggle("oculto", !pos.visible);
        el.style.left = `${pos.x}px`;
        el.style.top = `${pos.y}px`;
        el.style.opacity = vista.opacidad.toFixed(2);
        el.style.fontSize = `${vista.tamano.toFixed(0)}px`;
        const tx = formatoNumero(n.dano);
        if (tx !== textos[i]) {
          textos[i] = tx;
          el.textContent = tx;
        }
      }
    },
    dispose() {
      for (const el of els) el.remove();
    },
  };
}
