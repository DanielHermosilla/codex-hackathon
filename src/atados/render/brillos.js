import * as THREE from "three";

/** @param {import('./tipos.js').Keep} keep */
export function crearBrillos(keep) {
  // Un degradado compartido para halos y partículas. El centro tiene más energía que el borde.
  const lado = 48;
  const datos = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) {
    for (let x = 0; x < lado; x++) {
      const r = Math.hypot(
        ((x + 0.5) * 2) / lado - 1,
        ((y + 0.5) * 2) / lado - 1,
      );
      const i = (x + y * lado) * 4;
      datos[i] = datos[i + 1] = datos[i + 2] = 255;
      datos[i + 3] = Math.round(255 * Math.max(0, 1 - r * r) ** 3);
    }
  }
  const mapa = keep(new THREE.DataTexture(datos, lado, lado));
  mapa.minFilter = mapa.magFilter = THREE.LinearFilter;
  mapa.needsUpdate = true;
  const plano = keep(new THREE.PlaneGeometry(2, 2).rotateX(-Math.PI / 2));

  return {
    /** @param {THREE.Object3D} padre @param {number} color */
    halo(padre, color) {
      const material = keep(
        new THREE.SpriteMaterial({
          map: mapa,
          color,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
          toneMapped: false,
        }),
      );
      const sprite = new THREE.Sprite(material);
      padre.add(sprite);
      return sprite;
    },
    /** Aro de radio 1 con bordes suaves. @param {THREE.Object3D} padre @param {number} color */
    aro(padre, color) {
      const u = {
        color: { value: new THREE.Color(color) },
        opacidad: { value: 1 },
      };
      const material = keep(
        new THREE.ShaderMaterial({
          uniforms: u,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          vertexShader: `
          varying vec2 local;
          void main() {
            local = uv * 2.0 - 1.0;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
          fragmentShader: `
          uniform vec3 color;
          uniform float opacidad;
          varying vec2 local;
          void main() {
            float r = length(local);
            float distancia = (r - 0.96) * 70.0;
            float penumbra = (r - 0.91) * 13.0;
            float nucleo = exp(-distancia * distancia);
            float halo = exp(-penumbra * penumbra);
            float borde = 1.0 - smoothstep(0.985, 1.0, r);
            gl_FragColor = vec4(color, opacidad * borde * (0.8 * nucleo + 0.35 * halo));
            #include <colorspace_fragment>
          }`,
        }),
      );
      const malla = new THREE.Mesh(plano, material);
      malla.renderOrder = 4;
      padre.add(malla);
      return { malla, u };
    },
  };
}
