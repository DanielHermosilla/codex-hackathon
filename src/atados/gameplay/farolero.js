// El Farolero toca una sola prueba a la vez. Todas las marcas viven en coordenadas del mundo.
import { segmentInsideCircle } from "./cadena.js";
import { registrarDano } from "./jefe.js";

/** @typedef {import("./tipos.js").Mundo} Mundo */
/** @typedef {import("./tipos.js").Combate} Combate */
/** @typedef {import("./tipos.js").Punto} Punto */
/** @typedef {Punto & {r:number}} Marca */
/** @typedef {"prisma" | "ecos" | "campanas"} Gesto */
/** @typedef {"aviso" | "reto" | "acierto" | "fallo"} Etapa */
/** @typedef {ReturnType<typeof crearFarolero>} Farolero */

/** @param {Mundo} w */
export function crearFarolero(w) {
  const aviso = w.cfg.jefes.farolero.pruebas.aviso;
  return {
    tipo: /** @type {Gesto} */ ("prisma"),
    etapa: /** @type {Etapa} */ ("aviso"),
    vuelta: 1,
    paso: 0,
    aciertos: 0,
    duracion: aviso,
    restante: aviso,
    marcas: /** @type {Marca[]} */ ([]),
  };
}

/** La barra y la lógica leen el mismo plazo en segundos. @param {Farolero} f @param {Etapa} etapa @param {number} tiempo */
function iniciarEtapa(f, etapa, tiempo) {
  f.etapa = etapa;
  f.restante = f.duracion = tiempo;
}

/** Las posiciones se fijan al anunciar el gesto, incluida la huella de cada personaje vivo.
 * @param {Combate} c @param {Farolero} f */
export function anunciarPrueba(c, f) {
  const reglas = c.cfg.jefes.farolero.pruebas;
  const radio = reglas[f.tipo].radio;
  f.marcas.length = 0;
  f.paso = 0;
  if (f.tipo === "ecos") {
    for (const p of c.w.players) {
      if (p.alive) f.marcas.push({ x: p.x, z: p.z, r: radio });
    }
  } else if (f.tipo === "campanas") {
    const puestos = reglas.campanas.puestos;
    for (let i = 0; i < puestos.length; i++) {
      // La salida rota en cada vuelta, conservando el orden que muestra la arena.
      const [x, z] = puestos[(i + f.vuelta - 1) % puestos.length];
      f.marcas.push({ x, z, r: radio });
    }
  } else {
    const puestos = reglas.prisma.puestos;
    const [x, z] = puestos[(f.vuelta - 1) % puestos.length];
    f.marcas.push({ x, z, r: radio });
  }
  iniciarEtapa(f, "aviso", reglas.aviso);
  c.ctx.emitir("farol_aviso", { gesto: f.tipo, vuelta: f.vuelta });
}

/** El borde dibujado es el que cruza el centro de los pies. @param {Punto} p @param {Marca} marca */
function pisa(p, marca) {
  return (p.x - marca.x) ** 2 + (p.z - marca.z) ** 2 <= marca.r ** 2;
}

/** @param {Mundo} w @param {Marca} m */
function capturaPrisma(w, m) {
  const [a, b] = w.players;
  if (!a.alive || !b.alive)
    return (a.alive && pisa(a, m)) || (b.alive && pisa(b, m));
  // El prisma debe quedar entre los dos. Un ángulo de 90° ya sirve, sin pedir una alineación exacta.
  if (
    pisa(a, m) ||
    pisa(b, m) ||
    (a.x - m.x) * (b.x - m.x) + (a.z - m.z) * (b.z - m.z) > 0
  )
    return false;
  const { x, z, n } = w.chain;
  // Se comprueban los eslabones simulados; una cadena floja puede dibujar una curva.
  for (let i = 0; i < n; i++) {
    if (segmentInsideCircle(x[i], z[i], x[i + 1], z[i + 1], m.x, m.z, m.r) > 0)
      return true;
  }
  return false;
}

/** Solo se castiga a los vivos indicados en la máscara (bit 0 Sael y bit 1 Odo).
 * @param {Combate} c @param {Farolero} f @param {number} expuestos */
function resolver(c, f, expuestos) {
  const reglas = c.cfg.jefes.farolero.pruebas;
  if (expuestos) {
    if (f.vuelta > 1) {
      for (let i = 0; i < c.w.players.length; i++) {
        if (expuestos & (1 << i))
          c.ctx.golpear(
            { accion: { id: f.tipo } },
            i,
            reglas.danoFallo,
            0,
            0,
            0,
          );
      }
    }
    iniciarEtapa(f, "fallo", reglas.resultado);
    c.ctx.emitir("farol_fallo", { gesto: f.tipo, ensayo: f.vuelta === 1 });
    return;
  }
  iniciarEtapa(f, "acierto", reglas.resultado);
  f.aciertos++;
  c.ctx.emitir("farol_acierto", { gesto: f.tipo, aciertos: f.aciertos });
  // Cada sello vale una parte idéntica de la vida tanto en solitario como en cooperativo.
  const dano = Math.min(c.jefe.hp, c.jefe.hpMax / reglas.aciertosVictoria);
  const [a, b] = c.w.players;
  const cuota = dano / (Number(a.alive) + Number(b.alive));
  const reparto = [a.alive ? cuota : 0, b.alive ? cuota : 0];
  const aplicado = registrarDano(c.ctx, dano, 0, reparto);
  if (aplicado > 0) {
    c.stats.dano[0] += (aplicado / dano) * reparto[0];
    c.stats.dano[1] += (aplicado / dano) * reparto[1];
  }
}

/** @param {Combate} c @param {Farolero} f @param {number} dt */
export function actualizarFarolero(c, f, dt) {
  const [a, b] = c.w.players;
  const vivos = Number(a.alive) | (Number(b.alive) << 1);
  if (!vivos) return;
  const reglas = c.cfg.jefes.farolero.pruebas;
  f.restante = Math.max(0, f.restante - dt);
  const terminado = f.restante < 1e-8; // Cubre el redondeo de 1/60 de segundo.
  if (f.etapa === "acierto" || f.etapa === "fallo") {
    if (!terminado) return;
    if (f.tipo === "campanas") f.vuelta++;
    f.tipo =
      f.tipo === "prisma" ? "ecos" : f.tipo === "ecos" ? "campanas" : "prisma";
    anunciarPrueba(c, f);
    return;
  }
  if (f.etapa === "aviso") {
    if (terminado)
      iniciarEtapa(
        f,
        "reto",
        reglas[f.tipo].tiempo + (f.vuelta === 1 ? reglas.extraEnsayo : 0),
      );
    return;
  }

  if (f.tipo === "ecos") {
    if (!terminado) return;
    let expuestos = 0;
    for (let i = 0; i < c.w.players.length; i++) {
      const p = c.w.players[i];
      if (p.alive && f.marcas.some((m) => pisa(p, m))) expuestos |= 1 << i;
    }
    resolver(c, f, expuestos);
    return;
  }
  if (f.tipo === "prisma" && capturaPrisma(c.w, f.marcas[0])) {
    resolver(c, f, 0);
    return;
  }
  if (f.tipo === "campanas") {
    const marca = f.marcas[f.paso];
    if (c.w.players.some((p) => p.alive && pisa(p, marca))) {
      f.paso++;
      c.ctx.emitir("farol_campana", { paso: f.paso });
      if (f.paso === f.marcas.length) {
        resolver(c, f, 0);
        return;
      }
    }
  }
  if (terminado) resolver(c, f, vivos);
}
