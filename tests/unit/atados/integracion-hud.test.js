// Piezas puras de la integración: números de daño de los enemigos (ui/hud-numeros-enemigos.js) y la
// configuración común del renderer (render/renderer-config.js), que ninguna vista deshace al liberarse.
import { describe, it } from "node:test";
import { expect } from "./_expect.js";
import * as THREE from "three";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  nuevosNumerosEnemigos,
  aplicarHeridoEnemigo,
  avanzarNumerosEnemigos,
  vistaNumeroEnemigo,
} from "../../../src/atados/ui/hud-numeros-enemigos.js";
import { configurarRenderer } from "../../../src/atados/render/renderer-config.js";
import { CINE } from "../../../src/atados/ui/cinematica.js";

const E = CONFIG.hud.numeroEnemigo;
/** Enemigos mínimos con lo que lee el HUD (id y posición). */
const enemigos = [
  { id: 0, x: 2, z: -40 },
  { id: 1, x: -3, z: -60 },
];
const herido = (id, dano) => ({ tipo: "enemigo:herido", id, dano });

describe("números de daño de los enemigos", () => {
  it("un corte saca un número sobre ese enemigo y se apaga solo", () => {
    const pool = nuevosNumerosEnemigos(E.pool);
    expect(aplicarHeridoEnemigo(pool, herido(1, 120), enemigos, CONFIG)).toBe(
      true,
    );
    const n = pool.find((x) => x.activo);
    expect(n?.x).toBe(-3);
    expect(n?.z).toBe(-60);
    expect(n?.dano).toBe(120);
    const v = vistaNumeroEnemigo(n, CONFIG, {
      opacidad: 0,
      subida: 0,
      tamano: 0,
    });
    expect(v.opacidad).toBe(1);
    expect(v.tamano).toBeGreaterThan(0);
    avanzarNumerosEnemigos(pool, E.duracion + 0.01, CONFIG);
    expect(pool.some((x) => x.activo)).toBe(false);
  });

  it("ignora otros eventos, golpes chicos y enemigos que ya no están", () => {
    const pool = nuevosNumerosEnemigos(E.pool);
    expect(
      aplicarHeridoEnemigo(
        pool,
        { tipo: "enemigo:muere", id: 0 },
        enemigos,
        CONFIG,
      ),
    ).toBe(false);
    expect(
      aplicarHeridoEnemigo(
        pool,
        herido(0, CONFIG.hud.numeroDano.valorMin / 2),
        enemigos,
        CONFIG,
      ),
    ).toBe(false);
    expect(aplicarHeridoEnemigo(pool, herido(9, 100), enemigos, CONFIG)).toBe(
      false,
    );
    expect(pool.some((x) => x.activo)).toBe(false);
  });

  it("con el pool lleno reutiliza el número más viejo", () => {
    const pool = nuevosNumerosEnemigos(2);
    aplicarHeridoEnemigo(pool, herido(0, 50), enemigos, CONFIG);
    avanzarNumerosEnemigos(pool, 0.2, CONFIG);
    aplicarHeridoEnemigo(pool, herido(1, 60), enemigos, CONFIG);
    aplicarHeridoEnemigo(pool, herido(1, 70), enemigos, CONFIG);
    expect(pool.map((x) => x.dano).sort()).toEqual([60, 70]);
  });
});

describe("configuración del renderer compartido", () => {
  it("activar una vista vuelve a encender sombras y tone mapping", () => {
    const renderer = {
      shadowMap: { enabled: false, type: 0 },
      toneMapping: THREE.NoToneMapping,
      toneMappingExposure: 1,
    };
    configurarRenderer(renderer, CONFIG);
    expect(renderer.shadowMap.enabled).toBe(true);
    expect(renderer.shadowMap.type).toBe(THREE.PCFShadowMap);
    expect(renderer.toneMapping).toBe(THREE.NeutralToneMapping);
    expect(renderer.toneMappingExposure).toBe(CONFIG.render.exposicion);
  });
});

describe("franjas de cine", () => {
  it("leen sus tiempos de CONFIG.hud.cinematica", () => {
    expect(CINE).toBe(CONFIG.hud.cinematica);
  });
});
