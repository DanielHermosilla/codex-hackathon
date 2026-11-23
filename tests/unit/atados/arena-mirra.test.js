import assert from "node:assert/strict";
import { test } from "node:test";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearCombate } from "../../../src/atados/gameplay/combate.js";
import {
  crearArenaMirra,
  iniciarAcido,
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

test("la mira sigue 4.5 s, el tiro parte de la boca y da 1.2 s para salir antes del impacto", () => {
  const { a, ctx, paso } = preparar();
  const originales = ctx.w.pillars.slice();
  iniciarAcido(a, ctx);
  const { barril, acido } = a;
  const j = ctx.w.players[acido.objetivo];
  assert.equal(ctx.w.pillars.at(-1), barril);
  assert.equal(acido.cubreBarril, false);
  assert.ok(Math.abs(a.mecha - 6.7) < 1e-8);
  Object.assign(j, { x: barril.x + 1.4, z: barril.z });
  paso(4.5 - 1 / 60);
  assert.equal(acido.etapa, "punteria");
  assert.equal(acido.cubreBarril, true);
  j.z += 0.2;
  paso(1 / 60);
  assert.deepEqual([acido.x, acido.z], [j.x, j.z]);
  assert.equal(acido.etapa, "vuelo");
  assert.deepEqual(acido.tiro, acido.origen);
  const modelo = CONFIG.jefes.mirra.acido;
  assert.ok(
    Math.abs(
      acido.origen.x -
        (ctx.jefe.x + Math.cos(ctx.jefe.face) * modelo.bocaFrente),
    ) < 1e-8,
  );
  assert.ok(
    Math.abs(
      acido.origen.z -
        (ctx.jefe.z + Math.sin(ctx.jefe.face) * modelo.bocaFrente),
    ) < 1e-8,
  );
  assert.equal(acido.origen.y, modelo.bocaAltura);
  const destino = [j.x, j.z];
  j.x += 4;
  paso(0.6);
  assert.deepEqual([acido.x, acido.z], destino);
  assert.ok(Math.abs(acido.tiro.x - (acido.origen.x + acido.x) / 2) < 1e-8);
  assert.ok(Math.abs(acido.tiro.z - (acido.origen.z + acido.z) / 2) < 1e-8);
  assert.ok(acido.tiro.y > acido.origen.y);
  paso(0.6 - 1 / 60);
  assert.equal(a.charcos.length, 0);
  assert.equal(j.hp, CONFIG.player.maxHp);
  paso(1 / 60);
  assert.deepEqual(a.charcos, [{ x: destino[0], z: destino[1], r: acido.r }]);
  assert.equal(a.acido, null);
  assert.equal(a.barril, null);
  assert.equal(a.resultadoAcido.tipo, "apagado");
  assert.equal(a.mecha, 0);
  assert.equal(j.hp, CONFIG.player.maxHp);
  assert.deepEqual(ctx.w.pillars, originales);
  paso(2);
  assert.equal(a.resultadoAcido, null);
  assert.deepEqual(ctx.w.pillars, originales);
});

test("al morir el marcado se transfiere la mira únicamente antes del disparo", () => {
  const { a, ctx, paso } = preparar();
  iniciarAcido(a, ctx);
  const inicial = a.acido.objetivo,
    otro = 1 - inicial;
  paso(2);
  ctx.w.players[inicial].alive = false;
  paso(1 / 60);
  assert.equal(a.acido.objetivo, otro);
  assert.equal(a.acido.x, ctx.w.players[otro].x);
  paso(2.5 - 1 / 60);
  assert.equal(a.acido.etapa, "vuelo");
  const destino = [a.acido.x, a.acido.z];
  ctx.w.players[inicial].alive = true;
  ctx.w.players[otro].alive = false;
  ctx.w.players[inicial].x += 4;
  paso(0.5);
  assert.equal(a.acido.objetivo, otro);
  assert.deepEqual([a.acido.x, a.acido.z], destino);
});

test("la mecha se apaga en el borde anunciado y sigue encendida justo fuera", () => {
  for (const extra of [0, 0.005]) {
    const { a, ctx, paso } = preparar();
    iniciarAcido(a, ctx);
    Object.assign(ctx.w.players[a.acido.objetivo], {
      x: a.barril.x + a.acido.r + extra,
      z: a.barril.z,
    });
    paso(4.5);
    assert.equal(a.acido.cubreBarril, extra === 0);
    paso(1.2);
    assert.equal(a.barril === null, extra === 0);
  }
});

test("errar el barril detona una sola vez, derriba las coberturas más cercanas y alcanza a ambos", () => {
  const { a, ctx, paso } = preparar();
  iniciarAcido(a, ctx);
  paso(5.7);
  assert.ok(a.barril && a.charcos.length === 1);
  assert.equal(a.acido, null);
  assert.equal(a.explosion, null);
  assert.ok(Math.abs(a.mecha - 1) < 1e-8);
  const { x, z } = a.barril;
  const coberturas = ctx.w.pillars.filter((p) => p !== a.barril);
  const distancia = (p) => Math.hypot(p.x - x, p.z - z);
  const ordenadas = [...coberturas].sort((a, b) => distancia(a) - distancia(b));
  const n = Math.round(coberturas.length * 0.4);
  assert.ok(n / coberturas.length >= 0.3 && n / coberturas.length <= 0.5);
  const hp = ctx.w.players.map((p) => p.hp);
  ctx.w.players.forEach((p) => {
    p.x += 8;
  });
  paso(1 - 1 / 60);
  assert.equal(a.explosion, null);
  paso(1 / 60);
  assert.equal(a.barril, null);
  assert.equal(a.resultadoAcido.tipo, "explosion");
  assert.ok(a.explosion);
  assert.deepEqual(new Set(ctx.w.pillars), new Set(ordenadas.slice(n)));
  paso(2);
  ctx.w.players.forEach((p, i) => assert.equal(p.hp, hp[i] - 520));
  assert.equal(a.explosion, null);
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
  iniciarAcido(a, ctx);
  paso(6.7);
  assert.equal(a.barril, null);
  assert.ok(a.explosion);
  assert.deepEqual(ctx.w.pillars, [ultima]);
});
test("el charco de ácido se evapora en 12 s y deja de dañar desde el borde hacia el centro", () => {
  const { a, ctx, paso } = preparar();
  a.charcos.push({ x: 0, z: 0, r: 2.4 });
  const [exterior, interior] = ctx.w.players;
  Object.assign(exterior, { x: 3, z: 0 });
  Object.assign(interior, { x: 3, z: 0 });
  paso(6);
  assert.ok(Math.abs(a.charcos[0].r - 1.2) < 1e-7);
  exterior.x = 1.6;
  interior.x = 0.4;
  paso(1 / 60);
  assert.equal(exterior.hp, CONFIG.player.maxHp);
  assert.equal(interior.hp, CONFIG.player.maxHp - 180);
  interior.x = 3;
  paso(6);
  assert.equal(a.charcos.length, 0);
  interior.x = 0;
  paso(1);
  assert.equal(interior.hp, CONFIG.player.maxHp - 180);
});

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
