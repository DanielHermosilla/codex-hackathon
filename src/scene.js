import * as THREE from "three";
import { TRACK_SIZE } from "./movement.js";

// El color del fondo también aparece en el CSS mientras carga la escena.
const BACKGROUND = 0x101a28;

/**
 * Crea la pista. Recibe posiciones del juego y las convierte en cuadros del canvas.
 * @param {HTMLCanvasElement} canvas Elemento donde Three.js dibuja la pista.
 * @param {WebGL2RenderingContext} context Conexión del navegador con WebGL.
 */
export function createScene(canvas, context) {
  // El renderizador dibuja dentro del canvas existente y suaviza los bordes.
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
  });

  // La escena reúne la cámara, el suelo, el cubo y las luces.
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);

  // La cámara ortográfica mantiene el mismo tamaño de celda en toda la pista.
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 50);
  // La miramos desde arriba y desde el frente. Así las flechas coinciden con la pantalla.
  camera.position.set(0, 13, 14);
  camera.lookAt(0, 0, 0);

  // BoxGeometry recibe ancho, alto y profundidad, en ese orden.
  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(TRACK_SIZE, 0.3, TRACK_SIZE),
    new THREE.MeshLambertMaterial({ color: 0x234359 }),
  );
  // Dejamos la cara superior del suelo en Y = 0.
  floor.position.y = -0.15;
  scene.add(floor);

  // Con tantas divisiones como unidades, cada cuadrícula mide una unidad.
  const grid = new THREE.GridHelper(TRACK_SIZE, TRACK_SIZE, 0x86a4ac, 0x496778);
  // Un desnivel pequeño evita que la cuadrícula y el suelo parpadeen al superponerse.
  grid.position.y = 0.005;
  scene.add(grid);

  // Cambia este material o esta geometría para probar otra apariencia del jugador.
  const player = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 0.9, 0.9),
    new THREE.MeshLambertMaterial({ color: 0xffb35c }),
  );
  scene.add(player);

  // La luz ambiente deja visibles las caras del cubo que están en sombra.
  scene.add(new THREE.AmbientLight(0xc9ddff, 1.4));
  // La luz direccional da volumen al cubo. Su posición define desde dónde llega.
  const keyLight = new THREE.DirectionalLight(0xffe2b6, 2.2);
  keyLight.position.set(-4, 8, 5);
  scene.add(keyLight);

  // Reutilizamos este vector para consultar la resolución sin crear objetos por cuadro.
  const size = new THREE.Vector2();

  /**
   * Dibuja la pista con el cubo en la posición que calculó el juego.
   * @param {{ x: number, z: number }} position Posición sobre el suelo.
   */
  return function render(position) {
    // El CSS define el tamaño visible y el renderizador ajusta sus píxeles internos.
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    // Limitar la densidad reduce el costo en pantallas de alta resolución.
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderer.getSize(size);
    // Actualizamos la cámara y el buffer solo si algo cambió desde el último cuadro.
    if (
      size.x !== width ||
      size.y !== height ||
      renderer.getPixelRatio() !== pixelRatio
    ) {
      const aspect = width / height;
      // Conservamos margen a los lados en pantallas estrechas.
      const halfHeight = Math.max(6, (TRACK_SIZE / 2 + 0.8) / aspect);
      camera.left = -halfHeight * aspect;
      camera.right = halfHeight * aspect;
      camera.top = halfHeight;
      camera.bottom = -halfHeight;
      camera.updateProjectionMatrix();

      renderer.setPixelRatio(pixelRatio);
      // false conserva el tamaño que controla el CSS.
      renderer.setSize(width, height, false);
    }

    // El centro del cubo queda a media altura para que su base toque el piso.
    player.position.set(position.x, 0.45, position.z);
    renderer.render(scene, camera);
  };
}
