// Cada partida tiene su propia carta y sus propios ajustes de jugador y esquiva.
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
