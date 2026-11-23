import { segmentInsideCircle } from "./cadena.js";

/** @typedef {import('./tipos.js').Ctx} Ctx */
/** @typedef {import('./tipos.js').Punto} Punto */
/** @typedef {import('./tipos.js').Pilar} Circulo */
/** @typedef {ReturnType<typeof crearArenaMirra>} Arena */

/** @typedef {Punto & {y:number}} Punto3 */
/** @typedef {Circulo & {etapa:"punteria"|"vuelo",t:number,duracion:number,objetivo:number,cubreBarril:boolean,origen:Punto3,tiro:Punto3}} Acido */
/** @typedef {Punto & {tipo:"apagado"|"explosion",t:number,duracion:number}} Resultado */

const ID_BARRIL = "barril-polvora";
const EPS = 1e-8;
export const IMPACTO_LUZ = 2.5; // s entre encender la fuente y comprobar la sombra

export function crearArenaMirra() {
  return {
    acido: /** @type {Acido|null} */ (null),
    barril: /** @type {Circulo|null} */ (null),
    charcos: /** @type {Circulo[]} */ ([]),
    resultadoAcido: /** @type {Resultado|null} */ (null),
    luz: /** @type {(Punto & {t:number,impacto:boolean})|null} */ (null),
    explosion: /** @type {(Punto & {t:number,origen:string})|null} */ (null),
    mecha: 0,
    mechaTotal: 0,
    danoCharcoEn: [0, 0],
  };
}

/** La marca apunta a los pies del jugador; la boca sigue la orientación de Mirra.
 * @param {Acido} acido @param {Circulo} barril @param {Ctx} ctx @param {number} dt */
function apuntar(acido, barril, ctx, dt) {
  const p = ctx.w.players[acido.objetivo];
  const { jefe } = ctx;
  const reglas = ctx.cfg.jefes.mirra.acido;
  acido.x = p.x;
  acido.z = p.z;
  // La mecha está en el centro. La misma lectura mueve el indicador y decide el impacto.
  acido.cubreBarril =
    Math.hypot(p.x - barril.x, p.z - barril.z) <= acido.r + EPS;
  const ang = Math.atan2(p.z - jefe.z, p.x - jefe.x);
  const giro = Math.atan2(Math.sin(ang - jefe.face), Math.cos(ang - jefe.face));
  const maxGiro = jefe.def.giro * dt;
  jefe.face += Math.min(maxGiro, Math.max(-maxGiro, giro));
  acido.origen.x = jefe.x + reglas.bocaFrente * Math.cos(jefe.face);
  acido.origen.z = jefe.z + reglas.bocaFrente * Math.sin(jefe.face);
  acido.origen.y = reglas.bocaAltura;
  Object.assign(acido.tiro, acido.origen);
}

/** El barril tiene un hueco transitable alrededor incluso si el marcado empieza junto al borde.
 * @param {Arena} a @param {Ctx} ctx */
export function iniciarAcido(a, ctx) {
  if (a.acido || a.barril) return;
  const { w } = ctx;
  const reglas = ctx.cfg.jefes.mirra.acido;
  let objetivo = Math.floor(ctx.rng.next() * w.players.length);
  if (!w.players[objetivo].alive) objetivo = 1 - objetivo;
  const p = w.players[objetivo];
  if (!p.alive) return;
  const ang = ctx.rng.range(0, 2 * Math.PI);
  // Deja sitio a un personaje entre el barril y el sólido más cercano.
  const margen = reglas.radioBarril + ctx.cfg.player.radius * 2;
  const solidos = [...w.pillars, ...a.charcos, w.dummy];
  for (const distancia of [
    reglas.distanciaBarril,
    reglas.distanciaBarril * 0.75,
  ]) {
    for (let n = 0; n < 24; n++) {
      const dir = ang + (n * Math.PI) / 12;
      const x = p.x + Math.cos(dir) * distancia,
        z = p.z + Math.sin(dir) * distancia;
      if (
        Math.hypot(x, z) > w.arenaRadius - margen ||
        solidos.some((s) => Math.hypot(x - s.x, z - s.z) <= s.r + margen) ||
        w.players.some((j) => Math.hypot(x - j.x, z - j.z) <= margen)
      )
        continue;
      a.barril = { id: ID_BARRIL, x, z, r: reglas.radioBarril };
      w.pillars.push(a.barril); // El barril frena a los personajes y a su cadena.
      a.mecha = a.mechaTotal =
        reglas.punteria + reglas.vuelo + reglas.mechaFinal;
      a.resultadoAcido = null;
      a.acido = {
        etapa: "punteria",
        objetivo,
        t: 0,
        duracion: reglas.punteria,
        x: p.x,
        z: p.z,
        r: reglas.radio,
        cubreBarril: false,
        origen: { x: 0, y: 0, z: 0 },
        tiro: { x: 0, y: 0, z: 0 },
      };
      apuntar(a.acido, a.barril, ctx, 0);
      return;
    }
  }
}

/** @param {Arena} a @param {Ctx} ctx */
export function iniciarLuz(a, ctx) {
  if (a.luz) return;
  const ang = ctx.rng.range(0, 2 * Math.PI),
    r = ctx.w.arenaRadius;
  a.luz = { x: r * Math.cos(ang), z: r * Math.sin(ang), t: 0, impacto: false };
}

/** El mismo segmento que une la fuente con el jugador determina la sombra.
 * @param {Punto} luz @param {Punto} jugador @param {Circulo[]} pilares */
export function bajoSombra(luz, jugador, pilares) {
  return pilares.some(
    (p) =>
      p.id !== ID_BARRIL &&
      segmentInsideCircle(luz.x, luz.z, jugador.x, jugador.z, p.x, p.z, p.r) >
        0,
  );
}

/** Al explotar, el barril derriba primero las coberturas cercanas.
 * @param {Arena} a @param {Ctx} ctx @param {Circulo} objetivo @param {string} origen @param {number} fraccion */
function detonar(a, ctx, objetivo, origen, fraccion) {
  const { x, z } = objetivo;
  a.explosion = { x, z, t: 0, origen };
  const coberturas = ctx.w.pillars.filter((p) => p !== objetivo);
  const distancia2 = (/** @type {Circulo} */ p) =>
    (p.x - x) ** 2 + (p.z - z) ** 2;
  const ordenadas = [...coberturas].sort(
    (p, q) => distancia2(p) - distancia2(q),
  );
  const cuota = Math.round(coberturas.length * fraccion);
  const destruidas = new Set(ordenadas.slice(0, cuota));
  // Conserva el orden de las coberturas que siguen en pie.
  ctx.w.pillars = coberturas.filter((p) => !destruidas.has(p));
  ctx.w.players.forEach((p, i) => {
    if (p.alive)
      ctx.golpear(
        { accion: { id: origen } },
        i,
        ctx.cfg.jefes.mirra.ritual.dano.explosion,
        0,
        x,
        z,
        true,
      );
  });
}

/** @param {Arena} a @param {Ctx} ctx @param {Circulo} barril @param {Resultado["tipo"]} tipo */
function resolverBarril(a, ctx, barril, tipo) {
  const reglas = ctx.cfg.jefes.mirra.acido;
  const { x, z } = barril;
  if (tipo === "explosion")
    detonar(a, ctx, barril, ID_BARRIL, reglas.fraccionCoberturas);
  else ctx.w.pillars = ctx.w.pillars.filter((p) => p !== barril);
  a.barril = null;
  a.mecha = 0;
  a.mechaTotal = 0;
  a.resultadoAcido = { tipo, x, z, t: 0, duracion: reglas.duracionResultado };
  ctx.emitir("mirra_barril", { resultado: tipo, x, z });
}

/** @param {Arena} a @param {Ctx} ctx @param {number} dt */
function avanzarAcido(a, ctx, dt) {
  const barril = a.barril;
  if (!barril) return;
  const reglas = ctx.cfg.jefes.mirra.acido;
  a.mecha = Math.max(0, a.mecha - dt);
  const acido = a.acido;
  if (!acido) {
    if (a.mecha <= EPS) resolverBarril(a, ctx, barril, "explosion");
    return;
  }
  if (acido.etapa === "punteria") {
    if (!ctx.w.players[acido.objetivo].alive) {
      const otro = 1 - acido.objetivo;
      if (!ctx.w.players[otro].alive) return;
      acido.objetivo = otro;
    }
    apuntar(acido, barril, ctx, dt);
    const queda = acido.duracion - acido.t;
    if (dt < queda - EPS) {
      acido.t += dt;
      return;
    }
    // Desde aquí se conservan tanto el origen como el destino, aunque muera el marcado.
    dt = Math.max(0, dt - queda);
    acido.etapa = "vuelo";
    acido.t = 0;
    acido.duracion = reglas.vuelo;
    ctx.emitir("mirra_escupe", { jugador: acido.objetivo });
  }
  acido.t = Math.min(acido.duracion, acido.t + dt);
  const u = acido.t / acido.duracion;
  const { origen, tiro } = acido;
  tiro.x = origen.x + (acido.x - origen.x) * u;
  tiro.z = origen.z + (acido.z - origen.z) * u;
  tiro.y = (1 - u) * origen.y + reglas.arco * 4 * u * (1 - u);
  if (acido.t < acido.duracion - EPS) return;
  a.charcos.push({ x: acido.x, z: acido.z, r: acido.r });
  a.acido = null;
  if (acido.cubreBarril) resolverBarril(a, ctx, barril, "apagado");
}

/** @param {Arena} a @param {Ctx} ctx @param {number} dt */
export function avanzarArenaMirra(a, ctx, dt) {
  const { players } = ctx.w;
  const reglas = ctx.cfg.jefes.mirra.acido;
  // El borde que se evapora deja de dañar en ese mismo paso.
  for (let i = a.charcos.length - 1; i >= 0; i--) {
    const h = a.charcos[i];
    h.r = Math.max(0, h.r - (dt * reglas.radio) / reglas.evaporacion);
    if (h.r < EPS) a.charcos.splice(i, 1);
  }
  if (
    a.resultadoAcido &&
    (a.resultadoAcido.t += dt) >= a.resultadoAcido.duracion
  )
    a.resultadoAcido = null;
  if (a.explosion && (a.explosion.t += dt) >= reglas.duracionOnda)
    a.explosion = null;
  avanzarAcido(a, ctx, dt);

  const luz = a.luz;
  if (luz) {
    luz.t += dt;
    if (!luz.impacto && luz.t >= IMPACTO_LUZ - 1e-8) {
      luz.impacto = true;
      players.forEach((p, i) => {
        if (!bajoSombra(luz, p, ctx.w.pillars))
          ctx.golpear(
            { accion: { id: "luz-divina" } },
            i,
            ctx.cfg.jefes.mirra.ritual.dano.luz,
            0,
            luz.x,
            luz.z,
            true,
          );
      });
    }
    if (luz.t >= IMPACTO_LUZ + 0.45) a.luz = null;
  }
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    a.danoCharcoEn[i] = Math.max(0, a.danoCharcoEn[i] - dt);
    if (!p.alive || a.danoCharcoEn[i] > EPS) continue;
    if (a.charcos.some((h) => Math.hypot(p.x - h.x, p.z - h.z) <= h.r)) {
      ctx.golpear(
        { accion: { id: "charco-acido" } },
        i,
        ctx.cfg.jefes.mirra.ritual.dano.acido,
        0,
        p.x,
        p.z,
        true,
      );
      a.danoCharcoEn[i] = reglas.intervaloDano;
    }
  }
}
