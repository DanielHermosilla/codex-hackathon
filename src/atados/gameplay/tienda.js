// Cada partida tiene su propia carta y sus propios ajustes de jugador y esquiva.
import { createChain } from "./cadena.js";
import { keepInsideCircle } from "./jugadores.js";

export const productos = /** @type {const} */ ([
  "italiano",
  "mote",
  "sopaipilla",
]);
/** @typedef {(typeof productos)[number]} Producto */
/** @typedef {typeof import("../core/config.js").CONFIG} Config */

/** Basta con que uno de los dos llegue al carro caminando.
 * @param {ReadonlyArray<{x:number,z:number,alive:boolean}>} jugadores
 * @param {{x:number,z:number}} carro @param {number} alcance */
export function juntoAlCarro(jugadores, carro, alcance) {
  for (const p of jugadores) {
    if (p.alive && (p.x - carro.x) ** 2 + (p.z - carro.z) ** 2 <= alcance ** 2)
      return true;
  }
  return false;
}

/** Activa el obstáculo del carro al detenerse.
 * @param {import("./tipos.js").Mundo} mundo */
export function estacionarCarro(mundo) {
  const { cfg, arenaRadius, players } = mundo;
  const { carroVictoria, huellaCarro } = cfg.tienda;
  const escala = cfg.render.puesto.escala;
  const margen = cfg.player.radius; // m de holgura para el cuerpo de cada jugador
  const minX = carroVictoria.x - huellaCarro.semiancho * escala - margen;
  const maxX = carroVictoria.x + huellaCarro.semiancho * escala + margen;
  const minZ = carroVictoria.z - huellaCarro.fondo * escala - margen;
  const maxZ = carroVictoria.z + huellaCarro.frente * escala + margen;

  /** Saca al jugador por la cara más cercana del carro.
   * @param {import("./tipos.js").Punto} pos */
  function despejar(pos) {
    const izquierda = pos.x - minX;
    const derecha = maxX - pos.x;
    const fondo = pos.z - minZ;
    const frente = maxZ - pos.z;
    const distancia = Math.min(izquierda, derecha, fondo, frente);
    if (distancia <= 0) return false;
    if (distancia === fondo) pos.z = minZ;
    else if (distancia === frente) pos.z = maxZ;
    else if (distancia === izquierda) pos.x = minX;
    else pos.x = maxX;
    return true;
  }

  // Usa el límite del mundo, que solo afecta a jugadores. Los eslabones siguen libres.
  mundo.limite = (pos, margenArena) => {
    const dentro = keepInsideCircle(pos, arenaRadius - margenArena);
    return despejar(pos) || dentro;
  };

  const [sael, odo] = players;
  const sx = sael.x,
    sz = sael.z;
  const ox = odo.x,
    oz = odo.z;
  const movioSael = despejar(sael);
  const movioOdo = despejar(odo);
  if (!movioSael && !movioOdo) return;

  if (Math.hypot(sael.x - odo.x, sael.z - odo.z) > mundo.chain.length) {
    // Si la salida más cercana tensa de más la cadena, el jugador superpuesto sale hacia su pareja.
    const jugador = movioSael ? sael : odo;
    const pareja = movioSael ? odo : sael;
    const x = movioSael ? sx : ox;
    const z = movioSael ? sz : oz;
    const dx = pareja.x - x;
    const dz = pareja.z - z;
    const hastaX = dx === 0 ? Infinity : ((dx > 0 ? maxX : minX) - x) / dx;
    const hastaZ = dz === 0 ? Infinity : ((dz > 0 ? maxZ : minZ) - z) / dz;
    const cruce = Math.min(hastaX, hastaZ);
    // Fija la cara exacta y usa la recta solo para la coordenada paralela a esa cara.
    jugador.x = cruce === hastaX ? (dx > 0 ? maxX : minX) : x + cruce * dx;
    jugador.z = cruce === hastaZ ? (dz > 0 ? maxZ : minZ) : z + cruce * dz;
  }

  // Al recolocar a los jugadores al llegar el carro, sus eslabones parten de las posiciones válidas.
  mundo.chain = createChain(sael.x, sael.z, odo.x, odo.z, cfg);
}

/** @param {Config} base */
export function crearTienda(base) {
  // Solo copiamos las dos secciones que cambian al comprar. El HUD y el combate leen estos mismos ajustes.
  const cfg = { ...base, player: { ...base.player }, dash: { ...base.dash } };
  /** @type {Set<Producto>} */
  const comprados = new Set();
  let saldo = 0; // Monedas de esta partida. Los cambios de sala conservan la misma tienda.
  return {
    cfg,
    get saldo() {
      return saldo;
    },
    /** Se llama una vez por evento de victoria. @param {number} monedas */
    acreditar(monedas) {
      if (Number.isSafeInteger(monedas) && monedas > 0) saldo += monedas;
    },
    /** @param {Producto} id */
    vendido: (id) => comprados.has(id),
    /** Cada producto alcanza para los dos. Los siguientes combates heredan los ajustes.
     * @param {Producto} id @param {import("./tipos.js").Jugador[]} jugadores */
    comprar(id, jugadores) {
      if (!productos.includes(id) || comprados.has(id)) return false;
      const precio = cfg.tienda.precios[id];
      if (saldo < precio) return false;
      if (id === "italiano") {
        cfg.player.maxHp += cfg.tienda.vidaItaliano; // puntos de vida máxima por jugador
        for (const p of jugadores)
          if (p.alive)
            p.hp = Math.min(cfg.player.maxHp, p.hp + cfg.tienda.vidaItaliano);
      } else if (id === "mote") {
        cfg.dash.cooldown *= 0.8; // un 20 % menos de espera entre esquivas
      } else {
        cfg.player.hurtIframes += 0.4; // segundos extra de protección después de un golpe
      }
      saldo -= precio;
      comprados.add(id); // Reservado una vez por partida, incluso al reabrir la carta.
      return true;
    },
  };
}
