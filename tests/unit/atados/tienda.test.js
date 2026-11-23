import { test } from "node:test";
import assert from "node:assert/strict";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  crearTienda,
  juntoAlCarro,
} from "../../../src/atados/gameplay/tienda.js";
import {
  createPlayer,
  hurtPlayer,
} from "../../../src/atados/gameplay/jugadores.js";

test("el italiano da vida una sola vez y respeta a los jugadores caídos", () => {
  const tienda = crearTienda(CONFIG);
  const sael = createPlayer("sael", 0, 0, tienda.cfg);
  const odo = createPlayer("odo", 0, 0, tienda.cfg);
  sael.hp = 400;
  assert.equal(tienda.saldo, 0);
  assert.equal(tienda.comprar("italiano", [sael, odo]), false);
  assert.equal(sael.hp, 400);
  assert.equal(tienda.vendido("italiano"), false);
  tienda.acreditar(24);
  assert.equal(tienda.comprar("italiano", [sael, odo]), false);
  tienda.acreditar(2); // Compra a 25 y conserva la moneda que sobra.
  odo.hp = 0;
  odo.alive = false;
  assert.ok(tienda.comprar("italiano", [sael, odo]));
  assert.equal(sael.hp, 650);
  assert.equal(odo.hp, 0);
  assert.equal(tienda.saldo, 1);
  assert.equal(tienda.comprar("italiano", [sael, odo]), false);
  assert.equal(sael.hp, 650);
  assert.equal(tienda.saldo, 1);
  assert.equal(tienda.cfg.player.maxHp, CONFIG.player.maxHp + 250);
});

test("las mejoras de esquiva y protección se aplican solo a esa partida", () => {
  const tienda = crearTienda(CONFIG);
  tienda.acreditar(22);
  assert.equal(tienda.comprar("sopaipilla", []), false);
  tienda.acreditar(1); // Con 23 monedas solo alcanza para la sopaipilla.
  assert.equal(tienda.comprar("mote", []), false);
  assert.ok(tienda.comprar("sopaipilla", []));
  assert.equal(tienda.saldo, 0);
  tienda.acreditar(25);
  assert.ok(tienda.comprar("mote", []));
  assert.equal(tienda.cfg.dash.cooldown, CONFIG.dash.cooldown * 0.8);
  const sael = createPlayer("sael", 0, 0, tienda.cfg);
  hurtPlayer(sael, 5, tienda.cfg);
  assert.equal(sael.hurtT, CONFIG.player.hurtIframes + 0.4);
  assert.equal(tienda.saldo, 0);
  const nueva = crearTienda(CONFIG);
  assert.equal(nueva.vendido("mote"), false);
  assert.equal(nueva.cfg.dash.cooldown, CONFIG.dash.cooldown);
  assert.equal(nueva.cfg.player.hurtIframes, CONFIG.player.hurtIframes);
});

test("la distancia de compra incluye el límite y exige un personaje vivo", () => {
  const carro = { x: 2, z: 1 };
  const limite = { x: 2, z: 4, alive: true };
  const lejos = { x: 6, z: 1, alive: true };
  assert.equal(juntoAlCarro([limite, lejos], carro, 3), true);
  assert.equal(juntoAlCarro([lejos, limite], carro, 3), true);
  assert.equal(
    juntoAlCarro([lejos, { ...limite, alive: false }], carro, 3),
    false,
  );
  assert.equal(juntoAlCarro([{ ...limite, z: 4.01 }], carro, 3), false);
});
