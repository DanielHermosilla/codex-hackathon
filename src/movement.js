// El tamaño de la pista se comparte con la escena. Cada unidad equivale a una celda.
export const TRACK_SIZE = 12;
// Dejamos espacio entre el centro del cubo y el borde para que no sobresalga.
const EDGE = TRACK_SIZE / 2 - 0.75;
// Cambia este valor para ajustar cuántas unidades recorre el cubo por segundo.
const SPEED = 5;

/**
 * Actualiza la posición que recibe, sin depender del teclado ni de Three.js.
 * @param {{ x: number, z: number }} position Posición horizontal del cubo.
 * @param {number} x Eje izquierda/derecha, entre -1 y 1.
 * @param {number} z Eje arriba/abajo, entre -1 y 1.
 * @param {number} seconds Tiempo transcurrido desde el cuadro anterior.
 */
export function move(position, x, z, seconds) {
  // Si no hay dirección, dejamos el cubo quieto sin hacer más cálculos.
  if (x === 0 && z === 0) return;

  // La longitud de la dirección diagonal es √2. Dividir por ella iguala la velocidad.
  const distance = (SPEED * seconds) / Math.hypot(x, z);
  // X recorre la pista de izquierda a derecha.
  position.x = Math.max(-EDGE, Math.min(EDGE, position.x + x * distance));
  // Z recorre la pista en profundidad. La altura Y queda a cargo de la escena.
  position.z = Math.max(-EDGE, Math.min(EDGE, position.z + z * distance));
}
