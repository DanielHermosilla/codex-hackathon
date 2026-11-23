// Arte de los enemigos de pasillo (render/enemigos-arte.js): el pool se reutiliza sin crear objetos, la
// telegrafía sigue la etapa (aviso que se llena → peligro) y la muerte suelta sus partículas una sola vez.
// Corre en node: three.js arma la escena sin WebGL (no se dibuja nada).
import { describe, it } from "node:test";
import * as THREE from "three";
import { expect } from "./_expect.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import { crearEnemigosArte } from "../../../src/atados/render/enemigos-arte.js";

/** Escena de prueba con el mismo material de marca que usa el render (color, opacidad). */
function montar() {
  const scene = new THREE.Scene();
  const creados = { n: 0 }; // recursos de GPU registrados (geometrías y materiales): no debe crecer al sincronizar
  /** @type {import('../../../src/atados/render/tipos.js').Keep} */
  const keep = (o) => {
    creados.n++;
    return o; // en la prueba no hace falta liberar nada
  };
  /** @param {number} color @param {number} opacity */
  const decalMat = (color, opacity) =>
    keep(new THREE.MeshBasicMaterial({ color, opacity, transparent: true }));
  const arte = crearEnemigosArte({ scene, cfg: CONFIG, keep, decalMat });
  const fx = { polvo: 0, paja: 0, trozos: 0, sacudir: 0 };
  /** @type {import('../../../src/atados/render/tipos.js').FxJefe} */
  const efectos = {
    polvo: () => void fx.polvo++,
    paja: () => void fx.paja++,
    trozos: () => void fx.trozos++,
    sacudir: () => void fx.sacudir++,
  };
  return { scene, arte, fx, efectos, creados };
}

/**
 * Enemigo de prueba (EnemigoVista) con lo mínimo.
 * @param {Partial<import('../../../src/atados/gameplay/tipos.js').EnemigoVista>} o
 * @returns {import('../../../src/atados/gameplay/tipos.js').EnemigoVista}
 */
function enemigo(o) {
  return {
    id: 1,
    tipo: "segador",
    x: 0,
    z: 0,
    face: 0,
    r: 0.5,
    vivo: true,
    etapa: "quieto",
    etapaK: 0,
    hp: 10,
    hpMax: 10,
    golpeT: Infinity,
    zona: null,
    ...o,
  };
}

const plano = () => 0;

/** Mallas planas (marcas en el suelo) visibles en la escena. @param {THREE.Scene} scene */
const marcasVisibles = (scene) =>
  scene.children.filter(
    (o) => o instanceof THREE.Mesh && o.visible && o.renderOrder >= 2,
  );

describe("arte de enemigos de pasillo (D-140, D-209)", () => {
  it("el pool tiene tamaño fijo y no añade objetos a la escena al sincronizar", () => {
    const { scene, arte, efectos } = montar();
    const antes = scene.children.length;
    const lista = [
      enemigo({ id: 1 }),
      enemigo({ id: 2, tipo: "brincador", x: 4, etapa: "acecha" }),
    ];
    for (let f = 0; f < 30; f++)
      arte.sync(lista, plano, 1 / 60, f / 60, efectos);
    expect(scene.children.length).toBe(antes);
    // Por hueco: dos modelos (segador y brincador) y dos marcas.
    expect(antes).toBe(CONFIG.render.enemigos.max * 4);
  });

  it("solo se ve el modelo del tipo del enemigo, y los huecos libres quedan ocultos", () => {
    const { scene, arte, efectos } = montar();
    arte.sync([enemigo({ tipo: "brincador" })], plano, 1 / 60, 0, efectos);
    const grupos = scene.children.filter(
      (o) => o instanceof THREE.Group && o.visible,
    );
    expect(grupos).toHaveLength(1);
    arte.sync([], plano, 1 / 60, 0, efectos);
    expect(
      scene.children.filter((o) => o instanceof THREE.Group && o.visible),
    ).toHaveLength(0);
  });

  it("la telegrafía se llena con etapaK y pasa a peligro al activarse", () => {
    const { scene, arte, efectos } = montar();
    /** @type {import('../../../src/atados/gameplay/tipos.js').ZonaEnemigo} */
    const zona = {
      forma: "arco",
      x: 0,
      z: 0,
      ang: 0,
      radio: 2,
      angulo: 120,
      largo: 0,
      ancho: 0,
    };
    const e = enemigo({ etapa: "telegrafia", etapaK: 0.5, zona });
    arte.sync([e], plano, 1 / 60, 0, efectos);
    let marcas = marcasVisibles(scene);
    expect(marcas).toHaveLength(2); // aviso + relleno
    const relleno = marcas.find((m) => m.renderOrder === 3);
    expect(relleno?.scale.x).toBeCloseTo(1); // radio 2 × avance 0,5
    e.etapa = "activo";
    e.etapaK = 0.2;
    arte.sync([e], plano, 1 / 60, 0, efectos);
    marcas = marcasVisibles(scene);
    expect(marcas).toHaveLength(1); // solo el área en peligro
    const mat = marcas[0].material;
    expect(
      mat instanceof THREE.MeshBasicMaterial ? mat.color.getHex() : -1,
    ).toBe(CONFIG.paleta.gameplay.peligro);
  });

  it("la marca se apoya en la altura visual del suelo", () => {
    const { scene, arte, efectos } = montar();
    /** @type {import('../../../src/atados/gameplay/tipos.js').ZonaEnemigo} */
    const zona = {
      forma: "linea",
      x: 0,
      z: 0,
      ang: 0,
      radio: 0,
      angulo: 0,
      largo: 4,
      ancho: 1,
    };
    const e = enemigo({ tipo: "brincador", etapa: "activo", zona });
    arte.sync([e], () => 2, 1 / 60, 0, efectos);
    const [marca] = marcasVisibles(scene);
    expect(marca.position.y).toBeGreaterThan(2);
    expect(marca.scale.x).toBe(4);
  });

  it("en una rampa, cada vértice del tajo queda sobre el suelo (ningún borde se entierra)", () => {
    const { scene, arte, efectos } = montar();
    // Rampa que sube hacia +z: un tajo hacia +x tiene un borde cuesta arriba y otro cuesta abajo.
    /** @param {number} x @param {number} z */
    const rampa = (x, z) => 2 + 0.5 * z;
    /** @type {import('../../../src/atados/gameplay/tipos.js').ZonaEnemigo} */
    const zona = {
      forma: "arco",
      x: 0,
      z: 38,
      ang: 0,
      radio: 2.4,
      angulo: 100,
      largo: 0,
      ancho: 0,
    };
    const e = enemigo({ z: 38, etapa: "telegrafia", etapaK: 0.6, zona });
    arte.sync([e], rampa, 1 / 60, 0, efectos);
    const marcas = marcasVisibles(scene);
    expect(marcas).toHaveLength(2);
    const v = new THREE.Vector3();
    for (const m of marcas) {
      m.updateMatrixWorld(true);
      const pos = m.geometry.attributes.position;
      let lejos = 0; // m: el vértice más alejado del origen de la marca (comprueba que el abanico se abrió)
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld);
        const sobre = v.y - rampa(v.x, v.z); // m sobre el suelo en ese punto
        expect(sobre).toBeGreaterThan(0);
        expect(sobre).toBeLessThan(0.05);
        lejos = Math.max(lejos, Math.hypot(v.x, v.z - 38));
      }
      expect(lejos).toBeCloseTo(m.renderOrder === 2 ? 2.4 : 2.4 * 0.6);
    }
  });

  it("la primera telegrafía no crea geometría: las marcas salen del pool montado", () => {
    const { arte, efectos, creados } = montar();
    const antes = creados.n;
    /** @param {Partial<import('../../../src/atados/gameplay/tipos.js').ZonaEnemigo>} o */
    const zona = (o) => ({
      forma: "arco",
      x: 0,
      z: 0,
      ang: 0,
      radio: 2,
      angulo: 100,
      largo: 0,
      ancho: 0,
      ...o,
    });
    arte.sync(
      [
        enemigo({ etapa: "telegrafia", etapaK: 0.5, zona: zona({}) }),
        enemigo({
          id: 2,
          etapa: "activo",
          etapaK: 0.2,
          zona: zona({ angulo: 73 }), // otra apertura: tampoco crea nada
        }),
        enemigo({
          id: 3,
          tipo: "brincador",
          etapa: "telegrafia",
          etapaK: 0.3,
          zona: zona({ forma: "linea", largo: 4, ancho: 1 }),
        }),
      ],
      plano,
      1 / 60,
      0,
      efectos,
    );
    expect(creados.n).toBe(antes);
  });

  it("al acechar, la pose conserva el rebote del paso (segador y brincador)", () => {
    const { scene, arte, efectos } = montar();
    const lista = [
      enemigo({ id: 1, etapa: "acecha" }),
      enemigo({ id: 2, tipo: "brincador", x: 4, etapa: "acecha" }),
    ];
    // Grupo visible de cada tipo → su cuerpo (primer hijo: pivote de la pose).
    let maxSeg = 0,
      maxBrin = 0;
    for (let f = 0; f < 60; f++) {
      arte.sync(lista, plano, 1 / 60, f / 60, efectos);
      const visibles = scene.children.filter(
        (o) => o instanceof THREE.Group && o.visible,
      );
      for (const g of visibles) {
        const y = g.children[0].position.y;
        if (g.position.x === 4) maxBrin = Math.max(maxBrin, y);
        else maxSeg = Math.max(maxSeg, y);
      }
    }
    expect(maxSeg).toBeGreaterThan(0.01);
    expect(maxBrin).toBeGreaterThan(maxSeg); // el brincador avanza a saltitos más altos
  });

  it("al morir suelta paja y polvo una vez y se desmorona", () => {
    const { arte, fx, efectos } = montar();
    const e = enemigo({ vivo: false, etapa: "muere", etapaK: 0.1 });
    arte.sync([e], plano, 1 / 60, 0, efectos);
    arte.sync([e], plano, 1 / 60, 0, efectos);
    expect(fx.paja).toBe(1);
    expect(fx.polvo).toBe(1);
    e.etapaK = 0.6;
    arte.sync([e], plano, 1 / 60, 0, efectos);
    expect(fx.polvo).toBe(2); // segundo polvo a mitad del desmoronamiento
  });

  it("dispose quita todo de la escena", () => {
    const { scene, arte } = montar();
    arte.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
