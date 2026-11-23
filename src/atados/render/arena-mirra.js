// Señales de arena de Mirra. La simulación determina posición y tiempo de cada marca.
import * as THREE from "three";
import { crearAcidoMirra } from "./mirra-acido.js";

/** @param {{ scene: THREE.Scene, keep: import('./tipos.js').Keep, brillos: ReturnType<typeof import('./brillos.js').crearBrillos>, alturaArco: number }} args */
export function crearArenaMirraVisual({ scene, keep, brillos, alturaArco }) {
  const raiz = new THREE.Group();
  scene.add(raiz);
  /** @param {number} color */
  const colorPlano = (color) =>
    keep(new THREE.MeshBasicMaterial({ color, fog: false }));
  const oro = colorPlano(0xffe9a0);
  const disco = keep(new THREE.CircleGeometry(1, 80).rotateX(-Math.PI / 2));
  const acido = crearAcidoMirra(raiz, keep, alturaArco);
  /** @param {THREE.BufferGeometry} geo @param {THREE.Material} mat @param {THREE.Object3D} padre */
  function pieza(geo, mat, padre) {
    const mesh = new THREE.Mesh(geo, mat);
    padre.add(mesh);
    return mesh;
  }
  // Ilumina el suelo y los cuerpos cercanos. Sin sombras extra para mantener el coste bajo.
  const luzLocal = new THREE.PointLight(0xffc275, 0, 11);
  raiz.add(luzLocal);
  // El claro se ilumina hasta el borde. Cada píxel comprueba si un obstáculo corta
  // el segmento hacia la fuente. Así la sombra se ensancha detrás de cada pilar.
  const maxCoberturas = 16;
  const u = {
    foco: { value: new THREE.Vector2() },
    piedras: {
      value: Array.from({ length: maxCoberturas }, () => new THREE.Vector3()),
    },
    cantidad: { value: 0 },
    fuerza: { value: 0 },
    tiempo: { value: 0 },
  };
  const luzMat = keep(
    new THREE.ShaderMaterial({
      uniforms: u,
      transparent: true,
      depthWrite: false,
      vertexShader: `varying vec2 punto;
    void main() { vec4 p = modelMatrix * vec4(position,1.0); punto = p.xz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `uniform vec2 foco; uniform vec3 piedras[16]; uniform int cantidad;
    uniform float fuerza, tiempo; varying vec2 punto;
    void main() {
      vec2 rayo = punto - foco;
      float distancia2 = max(dot(rayo,rayo),0.0001);
      float seguro = 0.0;
      for(int i=0;i<16;i++){
        if(i>=cantidad) break;
        vec3 p = piedras[i];
        float t = clamp(dot(p.xy-foco,rayo)/distancia2,0.0,1.0);
        float d = distance(foco+t*rayo,p.xy);
        seguro = max(seguro,1.0-smoothstep(p.z-0.04,p.z+0.04,d));
      }
      float onda = 0.5 + 0.5*cos(length(rayo)*1.7-tiempo*3.0);
      float rayos = 0.5 + 0.5*cos(atan(rayo.y,rayo.x+0.0001)*34.0+tiempo*0.5);
      float cerca = 1.0 / (1.0 + length(rayo)*0.085);
      vec3 luz = mix(vec3(1.0,0.59,0.19),vec3(1.0,0.9,0.63),cerca);
      gl_FragColor = vec4(mix(luz,vec3(0.07,0.12,0.25),seguro),
                            mix(fuerza + cerca*(0.05*onda+0.035*rayos),fuerza*0.62,seguro));
      #include <colorspace_fragment>
    }`,
    }),
  );
  const claro = pieza(disco, luzMat, raiz);
  claro.position.y = 0.052;
  claro.renderOrder = 1;
  const sol = pieza(keep(new THREE.OctahedronGeometry(0.8)), oro, raiz);

  const haloSol = brillos.halo(raiz, 0xffc96d);
  haloSol.scale.setScalar(6);
  return {
    /** @param {import('./tipos.js').Mundo} w @param {import('./tipos.js').Combate} c @param {boolean} flashes */
    sync(w, c, flashes) {
      const a = c.arenaMirra;
      const pelea = c.estado === "pelea";
      raiz.visible = pelea;
      if (!pelea) return;
      luzLocal.intensity = 0;
      acido.sync(a, w.players, w.time);
      haloSol.visible = sol.visible = claro.visible = pelea && !!a.luz;
      if (pelea && a.luz) {
        const l = a.luz;
        sol.position.set(l.x, 2.5 + Math.sin(l.t * 2) * 0.18, l.z);
        sol.rotation.set(l.t * 0.42, l.t * 1.45, l.t * 0.6);
        haloSol.position.copy(sol.position);
        claro.scale.setScalar(w.arenaRadius);
        u.foco.value.set(l.x, l.z);
        u.tiempo.value = l.t;
        const carga = Math.min(1, l.t / 2.5);
        const salida = Math.min(1, 4 * l.t);
        const impacto = Math.max(0, 1 - (l.t - 2.5) / 0.45);
        u.fuerza.value = l.impacto
          ? impacto * (flashes ? 0.54 : 0.37)
          : salida * (0.17 + 0.16 * carga);
        haloSol.material.opacity = l.impacto
          ? 0.78 * impacto
          : 0.36 + 0.25 * carga;
        luzLocal.color.setHex(0xffc275);
        luzLocal.position.copy(sol.position);
        luzLocal.intensity = 10 * haloSol.material.opacity;
        let n = 0;
        for (const p of w.pillars) {
          if (p === a.barril || n === maxCoberturas) continue;
          u.piedras.value[n++].set(p.x, p.z, p.r);
        }
        u.cantidad.value = n;
      }
    },
  };
}
