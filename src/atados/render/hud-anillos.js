// Anillos diegéticos de los jugadores (D-063): en el suelo, alrededor de cada personaje y en su color fijo (D-051, D-142).
//   · arco exterior = vida (se vacía; con vida baja late, sin cambiar de tono)
//   · arco fino interior = dash en cooldown (solo se ve mientras recarga)
//   · aro fino exterior = anclado
// Va por debajo de las telegrafías (renderOrder menor, sin escribir profundidad): el aviso siempre queda encima.
// Se monta como `extra` de render/greybox.js. Nada de `new THREE.*` por frame: arcos prefabricados con drawRange.
import * as THREE from "three";
import { crearApoyoMarca } from "./apoyo-marca.js";
import { estadoAnillo, segmentosVisibles } from "../ui/hud-logica.js";

const INDICES_POR_SEGMENTO = 6; // RingGeometry con 1 segmento radial: 2 triángulos por segmento angular

/** Devuelve la fábrica de `extra` que monta los anillos de los jugadores. */
export function crearAnillosHud() {
  /** @param {{ scene: THREE.Scene, cfg: import('./tipos.js').Cfg, keep: import('./tipos.js').Keep, alturaSuelo?: (x: number, z: number) => number }} ctx */
  return ({ scene, cfg, keep: k, alturaSuelo }) => {
    const A = cfg.hud.anillo;
    const J = cfg.paleta.jugadores;
    // Empieza arriba (−z en pantalla) y da la vuelta completa; el drawRange recorta desde el final.
    /** @param {number[]} radios [interior, exterior] */
    const arco = ([r0, r1]) =>
      k(
        new THREE.RingGeometry(
          r0,
          r1,
          A.segmentos,
          1,
          Math.PI / 2,
          Math.PI * 2,
        ).rotateX(-Math.PI / 2),
      );
    const costra = cfg.paleta.corrupcion.costra; // fondo oscuro de los arcos: el color del jugador (limón) se pierde sobre suelos claros
    /** @param {number} color @param {number} opacity */
    const material = (color, opacity) =>
      k(
        new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
          toneMapped: false,
        }),
      );
    /** @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {THREE.Group} grupo @param {number} [capa] */
    const malla = (geo, mat, grupo, capa = 0) => {
      const m = new THREE.Mesh(geo, mat);
      m.renderOrder = A.orden + capa * 0.1; // fondo oscuro debajo, arcos encima; todo por debajo de las telegrafías
      grupo.add(m);
      return m;
    };

    const vistas = [J.sael, J.odo].map((color) => {
      const grupo = new THREE.Group();
      grupo.position.y = A.y;
      // Vida y dash recortan su geometría con drawRange: cada jugador tiene las suyas.
      const pista = malla(
        arco(A.vida),
        material(costra, A.pistaOpacidad),
        grupo,
      );
      const dashPista = malla(
        arco(A.dash),
        material(costra, A.dashPistaOpacidad),
        grupo,
      );
      const vida = malla(arco(A.vida), material(color, 1), grupo, 1);
      const dash = malla(
        arco(A.dash),
        material(color, A.dashOpacidad),
        grupo,
        1,
      );
      const ancla = malla(arco(A.ancla), material(color, 1), grupo, 1);
      // Pista y arco ocupan el mismo lugar. Comparten posiciones, pero conservan su propio drawRange.
      vida.geometry.setAttribute(
        "position",
        pista.geometry.getAttribute("position"),
      );
      dash.geometry.setAttribute(
        "position",
        dashPista.geometry.getAttribute("position"),
      );
      const apoyos = alturaSuelo
        ? [pista, dashPista, ancla].map((m) =>
            crearApoyoMarca(m.geometry, alturaSuelo),
          )
        : [];
      scene.add(grupo);
      return { grupo, pista, dashPista, vida, dash, ancla, apoyos };
    });
    /** @param {THREE.Mesh} m @param {number} n */
    const recortar = (m, n) => {
      m.visible = n > 0;
      m.geometry.setDrawRange(0, n * INDICES_POR_SEGMENTO);
    };

    return {
      /** @param {import('./tipos.js').Mundo} w */
      sync(w) {
        for (let i = 0; i < vistas.length; i++) {
          const p = w.players[i],
            v = vistas[i];
          const s = estadoAnillo(p, cfg, w.time);
          const base = alturaSuelo?.(p.x, p.z) ?? 0;
          v.grupo.position.set(p.x, base + A.y, p.z); // en la caída el indicador marca el lugar de aterrizaje
          for (const apoyar of v.apoyos) apoyar(p.x, p.z, base);
          /** @type {THREE.Material} */ (v.pista.material).opacity = s.vivo
            ? A.pistaOpacidad
            : A.muertoOpacidad * A.pistaOpacidad;
          recortar(v.vida, segmentosVisibles(s.vida, A.segmentos));
          /** @type {THREE.Material} */ (v.vida.material).opacity = s.pulso;
          recortar(
            v.dash,
            s.dashEnCooldown
              ? segmentosVisibles(s.dashProgreso, A.segmentos)
              : 0,
          );
          v.dashPista.visible = s.dashEnCooldown;
          v.ancla.visible = s.ancla;
        }
      },
      dispose() {
        for (const v of vistas) scene.remove(v.grupo);
      },
    };
  };
}

// Compone varias fábricas de `extra` en una (el render solo acepta una). Orden = orden de montaje y de sync.
/** @param {...((ctx: any) => any)} fabricas */
export function componerExtras(...fabricas) {
  /** @param {any} ctx */
  return (ctx) => {
    const exts = fabricas.map((f) => f(ctx)).filter(Boolean);
    /** @type {Record<string, any>} */
    const out = {
      /** @param {any} w @param {number} dt */
      sync(w, dt) {
        for (const e of exts) e.sync?.(w, dt);
      },
      /** @param {number[]} puntos */
      foco(puntos) {
        for (const e of exts) e.foco?.(puntos);
      },
      dispose() {
        for (const e of exts) e.dispose?.();
      },
      get ocultarMuneco() {
        return exts.some((e) => e.ocultarMuneco);
      },
    };
    const conPilar = exts.find((e) => e.crearPilar);
    if (conPilar)
      out.crearPilar = (/** @type {any} */ P) => conPilar.crearPilar(P);
    return out;
  };
}
