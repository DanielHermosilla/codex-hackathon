import { segmentInsideCircle } from "./cadena.js";

/** @typedef {import('./tipos.js').Ctx} Ctx */
/** @typedef {import('./tipos.js').Punto} Punto */
/** @typedef {import('./tipos.js').Pilar} Circulo */
/** @typedef {ReturnType<typeof crearArenaMirra>} Arena */

const radioHueco = 2.4;
const cierreHueco = 12; // segundos desde la apertura hasta recuperar todo el suelo
const finAviso = 4.5;
const finCaida = finAviso + 0.35;
const abrirSuelo = finCaida + 0.5;
const impactoLuz = 2.5;

export function crearArenaMirra() {
  return {
    orbe: /** @type {(Punto & {y:number,t:number,objetivo:number})|null} */ (
      null
    ),
    pilar: /** @type {Circulo|null} */ (null),
    huecos: /** @type {Circulo[]} */ ([]),
    luz: /** @type {(Punto & {t:number,impacto:boolean})|null} */ (null),
    explosion: /** @type {(Punto & {t:number})|null} */ (null),
    mecha: 0,
    danoHuecoEn: [0, 0],
  };
}

/** El jugador puede llegar al pilar antes de que caiga la bola. @param {Arena} a @param {Ctx} ctx */
export function iniciarOrbe(a, ctx) {
  if (a.orbe || a.pilar) return;
  const vivos = ctx.w.players;
  let i = Math.floor(ctx.rng.next() * vivos.length);
  if (!vivos[i].alive) i = 1 - i;
  const p = vivos[i];
  if (!p.alive) return;
  const ang = ctx.rng.range(0, 2 * Math.PI);
  // Se prueban direcciones alrededor del objetivo para no levantar el pilar dentro de un cuerpo.
  for (let n = 0; n < 24; n++) {
    const dir = ang + (n * Math.PI) / 12;
    const dist = 4.8;
    const x = p.x + Math.cos(dir) * dist,
      z = p.z + Math.sin(dir) * dist;
    const libre =
      Math.hypot(x, z) < ctx.w.arenaRadius - 1.4 &&
      [...ctx.w.pillars, ...a.huecos, ctx.w.dummy].every(
        (o) => Math.hypot(o.x - x, o.z - z) > o.r + 1.2,
      ) &&
      vivos.every((o) => Math.hypot(o.x - x, o.z - z) > 1.4);
    if (!libre) continue;
    a.pilar = { id: "pilar-void", x, z, r: 0.72 };
    ctx.w.pillars.push(a.pilar);
    a.orbe = { x: p.x, z: p.z, y: 2.7, t: 0, objetivo: i };
    return;
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
      p.id !== "pilar-void" &&
      segmentInsideCircle(luz.x, luz.z, jugador.x, jugador.z, p.x, p.z, p.r) >
        0,
  );
}

/** @param {Arena} a @param {Ctx} ctx @param {number} dt */
export function avanzarArenaMirra(a, ctx, dt) {
  const { players } = ctx.w;
  // Simulación y dibujo consultan el mismo radio. El hueco recién abierto empieza entero.
  for (let i = a.huecos.length - 1; i >= 0; i--) {
    const h = a.huecos[i];
    h.r = Math.max(0, h.r - (dt * radioHueco) / cierreHueco);
    if (h.r < 1e-8) a.huecos.splice(i, 1);
  }
  if (a.explosion && (a.explosion.t += dt) >= 0.6) a.explosion = null;
  if (a.mecha > 0 && a.pilar) {
    a.mecha -= dt;
    if (a.mecha <= 1e-8) {
      const { x, z } = a.pilar;
      a.explosion = { x, z, t: 0 };
      // La onda alcanza primero las coberturas más próximas; el pilar explosivo no cuenta.
      const coberturas = ctx.w.pillars.filter((p) => p !== a.pilar);
      const distancia2 = (/** @type {Circulo} */ p) =>
        (p.x - x) ** 2 + (p.z - z) ** 2;
      const porDistancia = [...coberturas].sort(
        (p, q) => distancia2(p) - distancia2(q),
      );
      const cuota = Math.round(coberturas.length * 0.4);
      const destruidas = new Set(porDistancia.slice(0, cuota));
      ctx.w.pillars = coberturas.filter((p) => !destruidas.has(p));
      a.pilar = null;
      players.forEach((p, i) =>
        ctx.golpear({ accion: { id: "pilar-void" } }, i, 52, 0, x, z, true),
      );
    }
  }
  const o = a.orbe;
  if (o && a.pilar) {
    if (o.t < finAviso - 1e-8) {
      const p = players[o.objetivo];
      o.x = p.x;
      o.z = p.z;
    }
    o.t += dt;
    o.y =
      0.24 +
      2.46 *
        (1 -
          Math.min(1, Math.max(0, (o.t - finAviso) / (finCaida - finAviso))) **
            2);
    if (o.t >= abrirSuelo - 1e-8) {
      a.huecos.push({ x: o.x, z: o.z, r: radioHueco });
      // El centro del pilar debe quedar sobre la parte de suelo perdida.
      if (Math.hypot(a.pilar.x - o.x, a.pilar.z - o.z) <= radioHueco) {
        ctx.w.pillars = ctx.w.pillars.filter((p) => p !== a.pilar);
        a.pilar = null;
      } else a.mecha = 1;
      a.orbe = null;
    }
  }
  const luz = a.luz;
  if (luz) {
    luz.t += dt;
    if (!luz.impacto && luz.t >= impactoLuz - 1e-8) {
      luz.impacto = true;
      players.forEach((p, i) => {
        if (!bajoSombra(luz, p, ctx.w.pillars))
          ctx.golpear(
            { accion: { id: "luz-divina" } },
            i,
            32,
            0,
            luz.x,
            luz.z,
            true,
          );
      });
    }
    if (luz.t >= impactoLuz + 0.45) a.luz = null;
  }
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    a.danoHuecoEn[i] = Math.max(0, a.danoHuecoEn[i] - dt);
    if (!p.alive || a.danoHuecoEn[i] > 0) continue;
    if (a.huecos.some((h) => Math.hypot(p.x - h.x, p.z - h.z) < h.r)) {
      ctx.golpear({ accion: { id: "suelo-void" } }, i, 18, 0, p.x, p.z, true);
      a.danoHuecoEn[i] = 0.8;
    }
  }
}
