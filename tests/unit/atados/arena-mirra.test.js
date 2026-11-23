import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearCombate } from "../../../src/atados/gameplay/combate.js";
import {
  crearArenaMirra,
  iniciarOrbe,
  iniciarLuz,
  avanzarArenaMirra,
  bajoSombra,
} from "../../../src/atados/gameplay/arena-mirra.js";

function preparar() {
  const { ctx } = crearCombate(CONFIG, { seed: 83 });
  const a = crearArenaMirra();
  const paso = (seg) => {
    for (let i = 0; i < Math.round(seg * 60); i++)
      avanzarArenaMirra(a, ctx, 1 / 60);
  };
  return { a, ctx, paso };
}

test("orbe sigue al marcado 4.5 s, cae, espera en el suelo y elimina solo el pilar marcado", () => {
  const { a, ctx, paso } = preparar();
  const originales = ctx.w.pillars.slice();
  iniciarOrbe(a, ctx);
  const j = ctx.w.players[a.orbe.objetivo];
  j.x = a.pilar.x + 1.3;
  j.z = a.pilar.z;
  paso(4.5);
  const x = j.x;
  j.x += 4;
  paso(0.2);
  assert.equal(a.orbe.x, x);
  assert.ok(a.orbe.y > 0.24 && a.orbe.y < 2.7);
  paso(0.15);
  assert.ok(Math.abs(a.orbe.y - 0.24) < 1e-9);
  paso(29 / 60);
  assert.equal(a.huecos.length, 0);
  paso(1 / 60);
  assert.equal(a.huecos.length, 1);
  assert.equal(a.orbe, null);
  assert.equal(a.pilar, null);
  assert.deepEqual(ctx.w.pillars, originales);
  j.x = x;
  paso(1 / 60);
  assert.ok(j.hp < CONFIG.player.maxHp);
});

test("perder el pilar detona una vez, derriba las coberturas más cercanas y alcanza a ambos", () => {
  const { a, ctx, paso } = preparar();
  iniciarOrbe(a, ctx);
  paso(5.35);
  assert.ok(a.pilar && a.huecos.length === 1);
  const { x, z } = a.pilar;
  const coberturas = ctx.w.pillars.filter((p) => p !== a.pilar);
  const distancia = (p) => Math.hypot(p.x - x, p.z - z);
  const ordenadas = [...coberturas].sort((a, b) => distancia(a) - distancia(b));
  const n = Math.round(coberturas.length * 0.4);
  assert.ok(n / coberturas.length >= 0.3 && n / coberturas.length <= 0.5);
  const hp = ctx.w.players.map((p) => p.hp);
  ctx.w.players.forEach((p) => {
    p.x += 8;
  });
  paso(1);
  assert.equal(a.pilar, null);
  assert.deepEqual(new Set(ctx.w.pillars), new Set(ordenadas.slice(n)));
  ctx.w.players.forEach((p, i) => assert.equal(p.hp, hp[i] - 520));
});

test("la luz respeta la dirección de llegada y solo cubre detrás del obstáculo", () => {
  const { a, ctx, paso } = preparar();
  iniciarLuz(a, ctx);
  assert.ok(Math.abs(Math.hypot(a.luz.x, a.luz.z) - ctx.w.arenaRadius) < 1e-9);
  Object.assign(a.luz, { x: 10, z: 0 });
  ctx.w.pillars = [{ id: "cubierta", x: 0, z: 0, r: 1 }];
  Object.assign(ctx.w.players[0], { x: -2, z: 0 });
  Object.assign(ctx.w.players[1], { x: 2, z: 0 });
  assert.equal(bajoSombra(a.luz, ctx.w.players[0], []), false);
  paso(2.5);
  assert.equal(ctx.w.players[0].hp, CONFIG.player.maxHp);
  assert.equal(ctx.w.players[1].hp, CONFIG.player.maxHp - 320);
});

test("la explosión conserva la última cobertura disponible", () => {
  const { a, ctx, paso } = preparar();
  const ultima = ctx.w.pillars[0];
  ctx.w.pillars = [ultima];
  iniciarOrbe(a, ctx);
  paso(6.4);
  assert.equal(a.pilar, null);
  assert.ok(a.explosion);
  assert.deepEqual(ctx.w.pillars, [ultima]);
});
test("el vacío se cierra en 12 s y deja de dañar desde el borde hacia el centro", () => {
  const { a, ctx, paso } = preparar();
  a.huecos.push({ x: 0, z: 0, r: 2.4 });
  const [exterior, interior] = ctx.w.players;
  Object.assign(exterior, { x: 3, z: 0 });
  Object.assign(interior, { x: 3, z: 0 });
  paso(6);
  assert.ok(Math.abs(a.huecos[0].r - 1.2) < 1e-7);
  exterior.x = 1.6;
  interior.x = 0.4;
  paso(1 / 60);
  assert.equal(exterior.hp, CONFIG.player.maxHp);
  assert.equal(interior.hp, CONFIG.player.maxHp - 180);
  interior.x = 3;
  paso(6);
  assert.equal(a.huecos.length, 0);
  interior.x = 0;
  paso(1);
  assert.equal(interior.hp, CONFIG.player.maxHp - 180);
});
