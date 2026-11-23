// Comprueba las mallas que recibe el renderer. Las alturas son las del suelo visual y la física permanece plana.
import { it } from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { CONFIG as cfg } from "../../../src/atados/core/config.js";
import { createWorld } from "../../../src/atados/gameplay/mundo.js";
import { crearRuta, puntoRuta } from "../../../src/atados/gameplay/ruta.js";
import { crearAlturaSuelo } from "../../../src/atados/render/altura.js";
import { crearCadenaArte } from "../../../src/atados/render/cadena-arte.js";
import { crearAnillosHud } from "../../../src/atados/render/hud-anillos.js";
import { crearCamara } from "../../../src/atados/render/camara.js";
import { crearVfx } from "../../../src/atados/render/vfx.js";

const keep = (o) => o;
const alturaSuelo = crearAlturaSuelo(cfg);
const pasillo = cfg.recorrido.pasillo;
const ruta = crearRuta(pasillo.ruta, pasillo.ancho);

it("vida, dash y ancla de cada jugador siguen su propio peldaño, también en diagonal", () => {
  const q = puntoRuta(ruta, 94.39);
  const w = createWorld(cfg, { sael: [q.x, q.z], odo: [0, 0] });
  const scene = new THREE.Scene();
  const anillos = crearAnillosHud()({ scene, cfg, keep, alturaSuelo });
  anillos.sync(w);
  const punto = new THREE.Vector3();
  let altos = 0;
  for (const grupo of scene.children) {
    for (const malla of grupo.children) {
      const pos = malla.geometry.getAttribute("position");
      for (let v = 0; v < pos.count; v++) {
        malla.localToWorld(punto.fromBufferAttribute(pos, v));
        const suelo = alturaSuelo(punto.x, punto.z);
        assert.ok(punto.y >= suelo + cfg.hud.anillo.y - 1e-6);
        if (suelo > 7.4) altos++;
      }
    }
  }
  assert.ok(altos > 0); // al menos un arco cruza la contrahuella de 7,10 a 7,43 m
});

it("ningún vértice del eslabón flojo atraviesa el peldaño entre Sael y Odo", (t) => {
  // Solo se sustituye la captura GPU de los reflejos. La geometría, el grosor y las matrices son reales.
  t.mock.method(
    THREE.PMREMGenerator.prototype,
    "fromScene",
    () => new THREE.WebGLCubeRenderTarget(1),
  );
  const a = puntoRuta(ruta, 1.749),
    b = puntoRuta(ruta, 4.331);
  const w = createWorld(cfg, { sael: [a.x, a.z], odo: [b.x, b.z] });
  const scene = new THREE.Scene();
  const arte = crearCadenaArte({
    scene,
    cfg,
    keep,
    renderer: {},
    world0: w,
    alturaSuelo,
  });
  arte.sync(w, 1 / 60);
  const metal = scene.children.find((o) => o.isInstancedMesh && o.castShadow);
  const posicion = metal.geometry.getAttribute("position"),
    matriz = new THREE.Matrix4(),
    punto = new THREE.Vector3();
  for (let i = 0; i < metal.count; i++) {
    metal.getMatrixAt(i, matriz);
    for (let v = 0; v < posicion.count; v++) {
      punto.fromBufferAttribute(posicion, v).applyMatrix4(matriz);
      assert.ok(
        punto.y >= alturaSuelo(punto.x, punto.z) - 1e-6,
        "metal enterrado en el eslabón " + i,
      );
    }
  }
});

it("el polvo nace sobre su propia huella y las astillas rebotan contra el escalón que cruzan", () => {
  const scene = new THREE.Scene();
  const escalon = (x) => (x > 0 ? 1 : 0);
  const vfx = crearVfx({ scene, cfg, keep, alturaSuelo: escalon });
  const mate = scene.children.find(
    (o) => o.isInstancedMesh && o.material.isMeshStandardMaterial,
  );
  const matriz = new THREE.Matrix4(),
    punto = new THREE.Vector3();
  vfx.polvo(0, 0, 24, cfg.paleta.cadena.bronce);
  vfx.sync(0, 0, 0, 0);
  let ladoAlto = 0;
  for (let i = 0; i < mate.count; i++) {
    mate.getMatrixAt(i, matriz);
    punto.setFromMatrixPosition(matriz);
    if (punto.x > 0) ladoAlto++;
    assert.ok(Math.abs(punto.y - escalon(punto.x) - 0.08) < 1e-6);
  }
  assert.ok(ladoAlto > 0 && ladoAlto < mate.count);
  vfx.trozos(-0.01, 0.08, 0, 32, cfg.paleta.cadena.bronce);
  vfx.sync(0.05, 0.05, 0, 0);
  let cruzaron = 0;
  for (let i = 24; i < mate.count; i++) {
    mate.getMatrixAt(i, matriz);
    punto.setFromMatrixPosition(matriz);
    if (punto.x > 0) cruzaron++;
    assert.ok(punto.y >= escalon(punto.x) + 0.03 - 1e-6);
  }
  assert.ok(cruzaron > 0);
});

it("el temblor al aterrizar dura 1,5 s y un golpe simultáneo conserva su duración corta", () => {
  const w = createWorld(cfg);
  const cam = crearCamara({ cfg, reducir: () => false });
  const C = cfg.render.templo.caida;
  cam.sacudir(C.sacudida, C.duracionSacudida);
  cam.sacudir(0.2); // el golpe se apaga antes de medio segundo
  cam.update(w, [], 0.5, null);
  assert.ok(Math.abs(cam.trauma - (C.sacudida * 2) / 3) < 1e-6);
  cam.update(w, [], 1, null);
  assert.ok(cam.trauma < 1e-6);
});
