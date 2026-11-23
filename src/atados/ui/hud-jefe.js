// HUD del jefe: presentación con nombre corrupto grande y el antiguo tachado debajo (D-064, D-180), barra de
// vida durante el combate (D-064), frases del jefe (D-093), derrota con frase y reintento (D-111, D-173) y las
// etiquetas de los drops placeholder. La lápida está en hud-lapida.js. Todo texto pasa por t() (D-102).
// Solo lee el estado: no decide gameplay. Sin transiciones CSS: los fundidos salen del tiempo de juego,
// así las capturas a paso fijo son fieles.
import { t } from "../i18n/index.js";
import { escalon, seguirVida } from "./hud-logica.js";

export const ESTILOS_JEFE = `
.hud .barra{position:absolute;left:50%;top:20px;transform:translateX(-50%);width:min(46vw,540px);text-align:center;}
.hud .barra .nombre{font-size:15px;letter-spacing:.14em;text-transform:uppercase;text-shadow:0 1px 4px var(--fondo),0 0 10px var(--fondo);margin-bottom:6px;}
.hud .barra .fondo{position:relative;height:9px;background:color-mix(in srgb,var(--fondo) 78%,transparent);border-radius:2px;overflow:hidden;
  box-shadow:0 0 0 1px color-mix(in srgb,var(--fondo) 90%,transparent);}
.hud .barra .estela{position:absolute;inset:0;transform-origin:left;background:var(--estela);}
.hud .barra .vida{position:absolute;inset:0;transform-origin:left;background:var(--barra);}
.hud .barra .marca{position:absolute;top:0;bottom:0;width:2px;margin-left:-1px;background:var(--fondo);}
.hud .barra.inv .vida{background:var(--barra-inv);}
.hud .velo{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.6em;text-align:center;}
.hud .pres{background:radial-gradient(ellipse 70% 46% at 50% 50%,color-mix(in srgb,var(--fondo) 62%,transparent),transparent 100%);}
.hud .pres .titulo{font-size:clamp(44px,7.2vw,104px);letter-spacing:.07em;line-height:1.05;text-shadow:0 3px 18px var(--fondo),0 0 40px var(--fondo);padding:0 4vw;}
.hud .pres .filete{width:clamp(120px,18vw,260px);height:1px;background:linear-gradient(90deg,transparent,var(--texto-suave),transparent);margin:.2em 0;}
.hud .pres .antiguo{font-size:clamp(24px,2.8vw,40px);font-style:italic;font-weight:500;color:var(--texto-suave);
  text-decoration:line-through;text-decoration-thickness:.07em;text-decoration-color:var(--barra);text-shadow:0 1px 8px var(--fondo);}
.hud .pres .frase,.hud .der .frase{font-size:clamp(20px,2.1vw,30px);font-style:italic;font-weight:500;max-width:56vw;text-shadow:0 1px 6px var(--fondo),0 0 14px var(--fondo);margin-top:.5em;}
.hud .aviso{font-size:clamp(16px,1.5vw,21px);font-weight:600;letter-spacing:.04em;color:var(--texto-suave);text-shadow:0 1px 4px var(--fondo);min-height:1.4em;}
.hud .der{background:color-mix(in srgb,var(--fondo) 80%,transparent);}
.hud .der .titulo{font-size:clamp(30px,4.2vw,60px);letter-spacing:.08em;}
.hud .der .frase{margin:.3em 0 .9em;}
.hud .sub{position:absolute;left:50%;bottom:9vh;transform:translateX(-50%);font-size:clamp(22px,2.2vw,30px);font-style:italic;font-weight:500;
  text-shadow:0 1px 6px var(--fondo),0 0 14px var(--fondo);white-space:nowrap;}
.hud .drop{position:absolute;transform:translate(-50%,-100%);font-size:15px;font-weight:600;color:var(--texto);-webkit-text-stroke:.2em var(--fondo);paint-order:stroke fill;white-space:nowrap;}
`;

/**
 * @param {string} tag
 * @param {string | null} cls
 * @param {HTMLElement | null | undefined} parent
 * @param {string | null} [text]
 */
function el(tag, cls, parent, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  parent?.appendChild(e);
  return e;
}

/**
 * @param {object} deps
 * @param {import('./hud-logica.js').Config} deps.cfg
 * @param {HTMLElement} deps.parent
 * @param {() => import('./hud-logica.js').Combate} deps.getCombate
 * @param {import('./hud-logica.js').ToScreen} deps.toScreen
 * @param {import('./hud-logica.js').RenderTexto} deps.renderTexto
 * @param {() => import('./hud-logica.js').EstadoDispositivo} deps.dispositivo
 */
export function crearHudJefe({
  cfg,
  parent,
  getCombate,
  toScreen,
  renderTexto,
  dispositivo,
}) {
  const H = cfg.hud;
  const barra = el("div", "barra", parent);
  const nombre = el("div", "nombre", barra);
  const fondo = el("div", "fondo", barra);
  const estelaEl = el("div", "estela", fondo);
  const vida = el("div", "vida", fondo);
  /** @type {HTMLElement[]} */
  const marcas = [];

  const pres = el("div", "velo pres", parent);
  const presTitulo = el("div", "titulo", pres);
  const presFilete = el("div", "filete", pres);
  const presAntiguo = el("div", "antiguo", pres);
  const presFrase = el("div", "frase", pres);
  const presSaltar = el("div", "aviso", pres);

  const der = el("div", "velo der", parent);
  const derTitulo = el("div", "titulo", der);
  const derFrase = el("div", "frase", der);
  const derRush = el("div", "aviso", der);
  const derAviso = el("div", "aviso", der);

  const sub = el("div", "sub", parent);
  const dropsEl = [0, 1, 2].map(() => el("div", "drop", parent));

  const cache = new Map();
  /** @param {HTMLElement} e @param {string} v */
  const set = (e, v) => {
    if (cache.get(e) !== v) {
      cache.set(e, v);
      e.textContent = v;
    }
  };
  /** @param {HTMLElement} e @param {boolean} on @param {number} [op] */
  const show = (e, on, op = 1) => {
    const d = on ? "" : "none";
    if (e.style.display !== d) e.style.display = d;
    const v = String(on ? Math.round(op * 100) / 100 : 0);
    if (e.style.opacity !== v) e.style.opacity = v;
  };
  /** @param {HTMLElement} e @param {number} v */
  const op = (e, v) => {
    const s = String(Math.round(v * 100) / 100);
    if (e.style.opacity !== s) e.style.opacity = s;
  };
  const pos = { x: 0, y: 0, visible: false };
  /** @type {import('./hud-logica.js').Combate['jefe']['def'] | null} */
  let ultimoJefe = null;
  let estela = 1;

  return {
    /** @param {number} dt */
    update(dt) {
      const c = getCombate();
      const j = c.jefe,
        def = j.def,
        tx = def.textos;
      const disp = { ...dispositivo(), solo: !!c.opts.solo };
      if (ultimoJefe !== def) {
        ultimoJefe = def;
        estela = 1;
        for (const m of marcas) m.remove();
        marcas.length = 0;
        for (const f of def.fases.slice(1)) {
          const m = el("div", "marca", fondo);
          m.style.left = `${f.desde * 100}%`;
          marcas.push(m);
        }
      }
      set(nombre, t(`jefe.${tx}.nombre`));
      const frac = Math.max(0, j.hp / j.hpMax);
      estela = seguirVida(estela, frac, dt, H.jefe.estela);
      vida.style.transform = `scaleX(${frac})`;
      estelaEl.style.transform = `scaleX(${estela})`;
      barra.classList.toggle("inv", j.invulnerable);
      show(barra, c.estado === "pelea" || c.estado === "derrota");

      // Presentación (D-064, D-180): velo con fundido; nombre, luego el antiguo tachado, luego la frase.
      const P = c.presentacion;
      const enPres = c.estado === "presentacion";
      const F = H.presentacion;
      show(
        pres,
        enPres,
        Math.min(escalon(P.t, 0, F.fundido), escalon(P.T - P.t, 0, F.fundido)),
      );
      if (enPres) {
        set(presTitulo, t(`jefe.${tx}.nombre`));
        set(presAntiguo, t(`jefe.${tx}.antiguo`));
        set(presFrase, t(`jefe.${tx}.presentacion`));
        renderTexto(presSaltar, P.saltable ? t("combate.saltar") : "", disp);
        op(presFilete, escalon(P.t, F.retrasoAntiguo * 0.6, F.fundidoTexto));
        op(presAntiguo, escalon(P.t, F.retrasoAntiguo, F.fundidoTexto) * 0.9);
        op(presFrase, escalon(P.t, F.retrasoFrase, F.fundidoTexto));
      }

      // Derrota (D-111, D-173): entra casi de golpe; «reintentar» aparece en cuanto se acepta.
      const enDer = c.estado === "derrota";
      show(der, enDer, escalon(c.derrotaT, 0, H.derrota.fundido));
      if (enDer) {
        set(derTitulo, t("combate.derrota"));
        set(derFrase, t(`jefe.${tx}.derrota`));
        set(derRush, c.opts.dificil ? t("combate.reiniciaRush") : "");
        renderTexto(
          derAviso,
          c.derrotaT >= cfg.jefes.comun.derrota.esperaReintento
            ? t("combate.reintentar")
            : "",
          disp,
        );
      }

      // Frases sueltas (burla, muerte) como subtítulo.
      const fr = c.frase && !enDer ? c.frase : null;
      show(sub, !!fr, fr ? Math.min(1, fr.t / 0.4) : 0);
      if (fr) set(sub, t(fr.clave));

      for (let i = 0; i < dropsEl.length; i++) {
        const d = c.drops[i],
          e = dropsEl[i];
        if (!d) {
          e.style.display = "none";
          continue;
        }
        toScreen(d.x, 1.4, d.z, pos);
        e.style.display = pos.visible ? "block" : "none";
        e.style.left = `${pos.x}px`;
        e.style.top = `${pos.y}px`;
        set(e, d.extra ? t("drop.extra") : t("drop.placeholder"));
      }
    },
    dispose() {
      for (const e of [barra, pres, der, sub, ...dropsEl]) e.remove();
    },
  };
}
