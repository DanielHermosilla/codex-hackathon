// Afirmaciones con forma de `expect(valor).toBe(...)` sobre `node:assert/strict`.
// Permite que las pruebas del combate se lean igual que una especificación y corran con `node --test`.
import assert from "node:assert/strict";

/**
 * Comprueba que `actual` contenga todas las claves de `esperado` con el mismo valor (recursivo).
 * @param {unknown} actual Valor real.
 * @param {unknown} esperado Subconjunto que debe aparecer.
 * @param {string} ruta Ruta de la clave, para el mensaje de error.
 */
function contieneObjeto(actual, esperado, ruta) {
  // Los valores simples se comparan tal cual.
  if (esperado === null || typeof esperado !== "object") {
    assert.deepEqual(
      actual,
      esperado,
      `${ruta}: ${String(actual)} ≠ ${String(esperado)}`,
    );
    return;
  }
  // Un arreglo esperado exige un arreglo del mismo largo.
  if (Array.isArray(esperado)) {
    assert.ok(Array.isArray(actual), `${ruta}: no es un arreglo`);
    assert.equal(actual.length, esperado.length, `${ruta}: largo distinto`);
    esperado.forEach((v, i) => contieneObjeto(actual[i], v, `${ruta}[${i}]`));
    return;
  }
  // Un objeto esperado solo revisa sus propias claves.
  assert.ok(
    actual !== null && typeof actual === "object",
    `${ruta}: no es un objeto`,
  );
  const real = /** @type {Record<string, unknown>} */ (actual);
  for (const [clave, valor] of Object.entries(esperado))
    contieneObjeto(real[clave], valor, `${ruta}.${clave}`);
}

/**
 * Crea los comparadores de un valor. `negado` invierte los que admiten `.not`.
 * @param {any} actual Valor que se revisa.
 * @param {string} [mensaje] Texto extra para el error.
 */
export function expect(actual, mensaje) {
  // Cada comparador lanza un AssertionError con el mensaje opcional.
  const m = (/** @type {string} */ texto) =>
    mensaje ? `${mensaje}: ${texto}` : texto;
  return {
    toBe: (/** @type {unknown} */ v) =>
      assert.ok(
        Object.is(actual, v),
        m(`${String(actual)} no es ${String(v)}`),
      ),
    toEqual: (/** @type {unknown} */ v) => assert.deepEqual(actual, v, mensaje),
    toBeTruthy: () => assert.ok(actual, m(`${String(actual)} no es verdadero`)),
    toBeNull: () => assert.equal(actual, null, mensaje),
    toBeGreaterThan: (/** @type {number} */ v) =>
      assert.ok(actual > v, m(`${actual} no es > ${v}`)),
    toBeGreaterThanOrEqual: (/** @type {number} */ v) =>
      assert.ok(actual >= v, m(`${actual} no es ≥ ${v}`)),
    toBeLessThan: (/** @type {number} */ v) =>
      assert.ok(actual < v, m(`${actual} no es < ${v}`)),
    toBeLessThanOrEqual: (/** @type {number} */ v) =>
      assert.ok(actual <= v, m(`${actual} no es ≤ ${v}`)),
    // Igual que Vitest: `digitos` decimales de precisión (2 por defecto).
    toBeCloseTo: (/** @type {number} */ v, digitos = 2) =>
      assert.ok(
        Math.abs(actual - v) < 10 ** -digitos / 2,
        m(`${actual} no se acerca a ${v}`),
      ),
    toContain: (/** @type {unknown} */ v) =>
      assert.ok(actual.includes(v), m(`no contiene ${String(v)}`)),
    toHaveLength: (/** @type {number} */ n) =>
      assert.equal(actual.length, n, mensaje),
    toMatchObject: (/** @type {object} */ v) =>
      contieneObjeto(actual, v, "valor"),
    not: {
      toBe: (/** @type {unknown} */ v) =>
        assert.ok(
          !Object.is(actual, v),
          m(`${String(actual)} es ${String(v)}`),
        ),
      toContain: (/** @type {unknown} */ v) =>
        assert.ok(!actual.includes(v), m(`contiene ${String(v)}`)),
    },
  };
}
