// Los rayos comprueban las superficies dibujadas sin abrir un contexto WebGL.
import assert from "node:assert/strict";
import { after, describe, it } from "node:test";
import * as THREE from "three";
import { CONFIG as cfg } from "../../../src/atados/core/config.js";
import {
  crearRuta,
  puntoRuta,
  nuevaProyeccion,
  proyectarRuta,
} from "../../../src/atados/gameplay/ruta.js";
import { crearAlturaSuelo } from "../../../src/atados/render/altura.js";
import { crearTemplo } from "../../../src/atados/render/templo.js";
import { resolverPaleta } from "../../../src/atados/render/paleta.js";

describe("suelo, columnas y paleta del Templo Celestial", () => {
  const scene = new THREE.Scene();
  const alturaSuelo = crearAlturaSuelo(cfg);
  const recursos = [];
  const templo = crearTemplo({
    scene,
    cfg,
    alturaSuelo,
    keep(recurso) {
      recursos.push(recurso);
      return recurso;
    },
  });
  scene.updateMatrixWorld();
  after(() => {
    templo.dispose();
    for (const recurso of recursos) recurso.dispose();
  });

  it("la salida del claro y el primer escalón sostienen los pies", () => {
    const rayo = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(0, -1, 0),
    );
    for (const [x, z] of [
      [2.1, -7.7],
      [4.8, -8.1],
      [-5.2, -8.2],
      [0.1, -10.21],
      [5.2, -9.915],
    ]) {
      rayo.ray.origin.set(x, 2, z); // desde arriba: la primera intersección es la que se ve
      const suelo = rayo.intersectObjects(scene.children)[0].point.y;
      assert.ok(Math.abs(suelo - alturaSuelo(x, z)) < 0.001);
    }
  });

  it("el pedestal deja libre el área transitable del lobby y del pasillo", () => {
    const { centro, radio } = cfg.recorrido.lobby;
    const [x, z] = cfg.render.templo.lobby.urna;
    // El círculo que contiene la base entera también debe quedar fuera del claro.
    const radioBase = Math.hypot(3 / 2, 2.2 / 2);
    assert.ok(Math.hypot(x - centro[0], z - centro[1]) > radio + radioBase);
    const pasillo = cfg.recorrido.pasillo;
    const ruta = crearRuta(pasillo.ruta, pasillo.ancho);
    const proyeccion = proyectarRuta(ruta, x, z, nuevaProyeccion());
    assert.ok(proyeccion.dist > pasillo.ancho / 2 + radioBase);
  });

  it("hay piedra desde el suelo hasta el fuste de la columna de enredo", () => {
    const p = cfg.recorrido.pasillo;
    const columna = p.pilares.find((pl) => pl.s === 80); // una columna de la terraza llana
    const q = puntoRuta(crearRuta(p.ruta, p.ancho), columna.s, columna.d);
    const suelo = alturaSuelo(q.x, q.z);
    const rayo = new THREE.Raycaster(
      new THREE.Vector3(),
      new THREE.Vector3(-1, 0, 0),
      0,
      2,
    );
    for (let cm = 1; cm <= 65; cm++) {
      rayo.ray.origin.set(q.x + 2, suelo + cm / 100, q.z); // escanea de lado cada centímetro de la unión
      assert.ok(
        rayo.intersectObjects(scene.children).length > 0,
        `hueco a ${cm} cm`,
      );
    }
  });

  it("el cambio de hora recolorea el terreno sin actualizar sus miles de vértices", () => {
    const textura = recursos.find((r) => r.isDataTexture);
    assert.equal(textura.image.data.byteLength, 40); // dos tonos por categoría, cinco categorías, RGBA
    const terreno = scene.children.find((m) => m.material?.map === textura);
    const uv = terreno.geometry.getAttribute("uv");
    const version = uv.version; // cada cara conserva su categoría y su variación
    templo.aplicarPaleta(resolverPaleta("pasillo", { progreso: 0 }));
    const base = textura.image.data.slice();
    templo.aplicarPaleta(resolverPaleta("pasillo", { progreso: 1 }));
    assert.notDeepEqual(base, textura.image.data);
    assert.equal(uv.version, version);
    assert.equal(terreno.geometry.getAttribute("color"), undefined);
  });
});
