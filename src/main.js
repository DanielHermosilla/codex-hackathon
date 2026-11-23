import { move } from "./movement.js";
import { createScene } from "./scene.js";
import "./style.css";

// Cada fila agrupa las teclas que hacen el mismo movimiento.
const LEFT = ["arrowleft", "a"];
const RIGHT = ["arrowright", "d"];
const UP = ["arrowup", "w"];
const DOWN = ["arrowdown", "s"];
// El conjunto permite consultar si una tecla participa del juego.
const MOVEMENT_KEYS = new Set([...LEFT, ...RIGHT, ...UP, ...DOWN]);

function start() {
  // Los IDs enlazan el código con el canvas, el botón y el mensaje de index.html.
  const canvas = document.querySelector("#pista");
  const reset = document.querySelector("#reiniciar");
  const error = document.querySelector("#error");

  // Confirmamos los tipos antes de usar propiedades específicas de un canvas o botón.
  if (
    !(canvas instanceof HTMLCanvasElement) ||
    !(reset instanceof HTMLButtonElement) ||
    !(error instanceof HTMLParagraphElement)
  ) {
    throw new Error("Faltan elementos de la pista en index.html.");
  }

  // Pedimos WebGL 2 con bordes suavizados antes de intentar construir la escena.
  const context = canvas.getContext("webgl2", { antialias: true });
  if (!context) {
    // Sin WebGL mostramos una instrucción útil y dejamos oculto el canvas.
    error.textContent =
      "Tu navegador no pudo activar WebGL 2. Prueba en otro navegador.";
    error.hidden = false;
    return;
  }

  // La simulación conserva solo X y Z. El renderizador se encarga de la altura.
  const position = { x: 0, z: 0 };
  const render = createScene(canvas, context);

  // Guardamos las teclas activas para mover el cubo mientras se mantienen pulsadas.
  /** @type {Set<string>} */
  const pressed = new Set();

  canvas.addEventListener("keydown", (event) => {
    // toLowerCase permite que las letras funcionen también con mayúsculas.
    const key = event.key.toLowerCase();
    if (
      !MOVEMENT_KEYS.has(key) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey
    )
      return;
    // Evitamos que las flechas desplacen la página mientras se juega.
    event.preventDefault();
    pressed.add(key);
  });

  canvas.addEventListener("keyup", (event) => {
    // Borramos la tecla aunque haya cambiado el estado de Shift desde la pulsación.
    const key = event.key.toLowerCase();
    pressed.delete(key);
  });

  // Si el foco sale de la pista o de la ventana, el navegador podría omitir keyup.
  canvas.addEventListener("blur", () => pressed.clear());
  window.addEventListener("blur", () => pressed.clear());

  reset.addEventListener("click", () => {
    // Volvemos al centro y devolvemos el foco para seguir jugando con el teclado.
    position.x = 0;
    position.z = 0;
    pressed.clear();
    canvas.focus();
  });

  // Arrancamos el reloj y mostramos los controles solo después de crear la escena.
  canvas.hidden = false;
  reset.hidden = false;
  let previousTime = performance.now();

  /**
   * El navegador llama a esta función antes de cada cuadro.
   * @param {number} now Tiempo en milisegundos desde que se abrió la página.
   */
  function frame(now) {
    // Convertimos a segundos y acotamos la pausa si el navegador deja de dibujar.
    const seconds = Math.min(Math.max(0, now - previousTime) / 1_000, 0.05);
    previousTime = now;

    // Cada dirección vale 0 o 1. Dos teclas opuestas se cancelan al restarlas.
    const x = Number(RIGHT.some(isPressed)) - Number(LEFT.some(isPressed));
    const z = Number(DOWN.some(isPressed)) - Number(UP.some(isPressed));
    move(position, x, z, seconds);
    render(position);

    // Pedimos otro cuadro al navegador, a su frecuencia de refresco.
    requestAnimationFrame(frame);
  }

  /** @param {string} key */
  function isPressed(key) {
    // Reutilizamos la función en cada cuadro, sin crear cuatro funciones nuevas.
    return pressed.has(key);
  }

  // Dibujamos inmediatamente para que la pista esté lista antes del primer cuadro.
  render(position);
  requestAnimationFrame(frame);
}

start();
