import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { URL } from "node:url";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { CONFIG } from "../../../src/atados/core/config.js";
import {
  colocarParaPrueba,
  crearCombate,
  forzarAtaque,
  pasoCombate,
  ponerVidaJefe,
  reintentar,
  saltarPresentacion,
  sinAtaques,
} from "../../../src/atados/gameplay/combate.js";
import { cancelarAccion } from "../../../src/atados/gameplay/jefe.js";
import { emptyInput } from "../../../src/atados/gameplay/mundo.js";
import {
  AJUSTE_ATAQUES,
  crearAtaquesMirra,
} from "../../../src/atados/render/ataques-mirra.js";
import { crearBrillos } from "../../../src/atados/render/brillos.js";
import { crearMirra } from "../../../src/atados/render/mirra-arte.js";

const dt = CONFIG.sim.fixedDt; // 1/60 s por paso de combate y por cuadro de prueba

function montar(t, id, pilares = []) {
  const cfg = structuredClone(CONFIG);
  cfg.feedback.hitstop.enabled = false; // los golpes no suspenden el reloj de la prueba
  cfg.damage.chain.scale = 0; // la cadena no interrumpe la acción que estamos probando
  const c = crearCombate(cfg, { seed: 1 });
  c.w.pillars = pilares; // arena despejada, salvo si el caso prueba una cobertura
  sinAtaques(c); // aísla el ataque forzado de la rotación de Mirra y los ritos
  colocarParaPrueba(c, { jefe: [0, 0], sael: [4, 0], odo: [4, 4] });
  const a = forzarAtaque(c, id);

  const scene = new THREE.Scene(); // solo se prueba la escena, sin contexto WebGL
  const recursos = [];
  const keep = (recurso) => {
    recursos.push(recurso); // pertenece a la escena y se libera al terminar el caso
    return recurso;
  };
  const vista = crearAtaquesMirra({
    scene,
    cfg,
    keep,
    brillos: crearBrillos(keep),
  });
  t.after(() => {
    vista.dispose();
    assert.equal(scene.children.length, 0); // la vista retira su grupo de la escena
    for (const recurso of recursos) recurso.dispose();
  });
  const huesos = { copa: new THREE.Bone(), abdomen: new THREE.Bone() };
  huesos.copa.position.y = 3.4; // m: de aquí salen las langostas
  const nada = () => {}; // solo medimos las piezas que dibuja la fábrica
  const polvo = [];
  const vfx = {
    paja: nada,
    polvo: (x, z) => polvo.push({ x, z }), // origen de cada bocanada que pide la vista
    trozos: nada,
  };
  const colores = { paja: 0xe7cf8a, polvo: 0xa38d63, grano: 0xd9a441 };
  const quietos = [emptyInput(), emptyInput()];
  const sync = (combate = c, reducido = false, delta = dt) =>
    vista.sync(combate, delta, huesos, vfx, colores, reducido);
  const pasos = (n) => {
    for (let i = 0; i < n; i++) {
      pasoCombate(c, quietos, dt); // el combate real escribe zonas y proyectiles
      sync(); // el efecto lee ese mismo estado
    }
  };
  const hasta = (condicion) => {
    for (let i = 0; i < 600 && !condicion(); i++) pasos(1);
    assert.ok(condicion(), "La simulación no llegó a la etapa esperada");
  };
  return { a, c, scene, huesos, sync, pasos, hasta, polvo };
}

function mallas(scene, tipo) {
  const resultado = [];
  scene.traverseVisible((objeto) => {
    if (!objeto.isMesh && !objeto.isSprite) return;
    if (objeto.isInstancedMesh && objeto.count === 0) return;
    if (objeto.material.transparent && objeto.material.opacity <= 0) return;
    if (!tipo || objeto.geometry?.type === tipo) resultado.push(objeto);
  });
  return resultado;
}

function matrizInstancia(malla, indice = 0) {
  const matriz = new THREE.Matrix4();
  malla.getMatrixAt(indice, matriz); // lee la posición y el tamaño que recibirá el dibujado
  const posicion = new THREE.Vector3();
  const escala = new THREE.Vector3();
  matriz.decompose(posicion, new THREE.Quaternion(), escala);
  assert.ok(
    escala.x > 0 && escala.y > 0 && escala.z > 0,
    "La pieza tiene volumen",
  );
  return posicion;
}

function cerca(actual, esperado) {
  assert.ok(Math.abs(actual - esperado) < 1e-5, `${actual} ≈ ${esperado}`);
}

for (const id of ["siega", "siega_doble"]) {
  test(`${id}: el filo sale del borde correcto y la estela sigue al arco`, (t) => {
    const { a, c, scene, pasos, hasta, sync } = montar(t, id);
    const [b] = a.bloques;
    const [zona] = b.zonas;
    const filos = id === "siega_doble" ? 2 : 1;
    pasos(24); // 0,4 s: los filos ya se ven durante el aviso
    const marcas = mallas(scene, "PlaneGeometry");
    assert.equal(marcas.length, filos);
    const [filo] = marcas;
    cerca(-filo.rotation.y, zona.ang - (zona.sentido * zona.apertura) / 2);

    hasta(() => zona.etapa === "activa" && zona.progreso > 0.35);
    assert.equal(mallas(scene, "PlaneGeometry").length, 1);
    cerca(
      -filo.rotation.y,
      zona.ang + zona.sentido * (zona.progreso - 0.5) * zona.apertura,
    );
    const [estela] = mallas(scene, "BufferGeometry");
    assert.ok(estela.geometry.index.count > 0); // el abanico contiene triángulos
    assert.equal(estela.scale.x, zona.r);

    if (id === "siega_doble") {
      hasta(() => b.sub === "entre");
      assert.equal(zona.sentido, -1); // el segundo aviso sale desde el lado opuesto
      assert.equal(mallas(scene, "PlaneGeometry").length, 2);
      cerca(-filo.rotation.y, zona.ang + zona.apertura / 2);
      hasta(() => zona.etapa === "activa" && zona.progreso > 0.35);
      sync(c, true, 0); // con movimiento reducido, el filo también sigue el arco de vuelta
      cerca(-filo.rotation.y, zona.ang - (zona.progreso - 0.5) * zona.apertura);
    }
    hasta(() => a.etapa === "recuperacion");
    assert.equal(mallas(scene, "PlaneGeometry").length, 2); // brazos clavados: dos surcos
  });
}

test("Siega doble repite la pose del GLB conservando la orientación en la vuelta", async (t) => {
  const { c, hasta } = montar(t, "siega_doble");
  colocarParaPrueba(c, { sael: [4, 1] }); // hace que Mirra apunte en diagonal
  const a = forzarAtaque(c, "siega_doble");
  const scene = new THREE.Scene();
  // Es el mismo archivo comprimido que carga la vista de juego.
  const bytes = await readFile(
    new URL("../../../public/atados/models/mirra.glb", import.meta.url),
  );
  const modelo = await new GLTFLoader()
    .setMeshoptDecoder(MeshoptDecoder)
    .parseAsync(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
      "",
    );
  const recursos = [];
  const vista = crearMirra({
    scene,
    cfg: c.cfg,
    keep: (recurso) => {
      recursos.push(recurso);
      return recurso;
    },
    modelos: { mirra: modelo },
    def: c.jefe.def,
  });
  t.after(() => {
    vista.dispose();
    scene.clear();
    for (const recurso of recursos) recurso.dispose();
  });
  const cuerpo = modelo.scene.parent;
  const clip = modelo.animations.find((clip) => clip.name === "siega");
  const brazo = vista.huesos.antebrazoI;
  const pista = clip.tracks.find(
    (pista) => pista.name === "antebrazoI.quaternion",
  );
  const rotacionClip = pista.createInterpolant();
  const esperada = new THREE.Quaternion();
  const actual = new THREE.Quaternion();
  const nada = () => {};
  const sincronizar = () =>
    vista.sync(c, c.w, dt, c.t, {
      flash: 0,
      fx: { polvo: nada, trozos: nada, sacudir: nada },
    });
  const orientacion = () => {
    cuerpo.updateWorldMatrix(true, false);
    assert.ok(cuerpo.matrixWorld.determinant() > 0); // girar conserva la orientación de la malla
    cerca(cuerpo.rotation.y, -c.jefe.face);
  };
  const comprobarPose = (segundosClip) => {
    sincronizar();
    orientacion();
    esperada.fromArray(rotacionClip.evaluate(segundosClip)).normalize();
    actual.copy(brazo.quaternion).normalize(); // los valores del GLB están cuantizados
    cerca(Math.abs(actual.dot(esperada)), 1);
  };

  const [bloque] = a.bloques;
  const [sector] = bloque.zonas;
  const golpe = c.cfg.render.jefe.golpe;
  hasta(() => a.etapa === "activo" && sector.progreso >= 0.5);
  assert.equal(sector.sentido, 1);
  comprobarPose(1 + sector.progreso * golpe); // primera pasada
  hasta(() => bloque.sub === "entre" && bloque.subT >= bloque.entre * 0.5);
  comprobarPose(bloque.subT / bloque.entre); // vuelve a tensar ambos brazos
  hasta(() => sector.etapa === "activa" && sector.progreso >= 0.5);
  assert.equal(sector.sentido, -1);
  comprobarPose(1 + sector.progreso * golpe); // segunda pasada, con la misma fase del clip
  hasta(() => a.etapa === "recuperacion");
  comprobarPose(1 + golpe);
  cancelarAccion(c.ctx, "prueba");
  sincronizar();
  orientacion();
});

test("Grano: las semillas salen de la boca, dejan sombra y levantan púas dentro del impacto", (t) => {
  const { a, c, scene, huesos, hasta, pasos, sync } = montar(t, "grano");
  const cabeza = new THREE.Group();
  cabeza.position.set(1, 0.5, -0.5); // traslada las mandíbulas en coordenadas del mundo
  huesos.mandI = new THREE.Bone();
  huesos.mandD = new THREE.Bone();
  huesos.mandI.position.set(0.2, 2.2, -0.4);
  huesos.mandD.position.set(1, 2.8, 0.4);
  cabeza.add(huesos.mandI, huesos.mandD);

  hasta(() => a.t > a.T * 0.75);
  const proyectiles = c.proyectiles.items.filter((p) => p.activo && p.t >= 0);
  const { zonas } = a.bloques[0];
  // Las semillas tienen dos tonos por vértice. Los puntos de la trayectoria no.
  const semillas = mallas(scene, "OctahedronGeometry").find((m) =>
    m.geometry.hasAttribute("color"),
  );
  const [sombras] = mallas(scene, "CircleGeometry");
  assert.ok(semillas && proyectiles.length > 0);
  assert.equal(semillas.count, proyectiles.length);
  assert.equal(semillas.count, zonas.length);
  assert.equal(sombras.count, proyectiles.length);
  for (const [i, p] of proyectiles.entries()) {
    const sombra = matrizInstancia(sombras, i);
    const semilla = matrizInstancia(semillas, i);
    cerca(sombra.x, semilla.x);
    cerca(sombra.z, semilla.z);
    assert.ok(semilla.y > sombra.y);
    cerca(p.x1, zonas[i].x);
    cerca(p.z1, zonas[i].z);
  }

  // Muestrea ambos extremos del vuelo sin esperar otro paso del combate.
  const [primero] = proyectiles;
  const vuelo = primero.t;
  primero.t = 0;
  sync(c, false, 0);
  const salida = matrizInstancia(semillas);
  // Boca: punto medio mundial (1,6, 3, −0,5) más 0,35 m hacia delante.
  cerca(salida.x, 1.6 + Math.cos(c.jefe.face) * 0.35);
  cerca(salida.y, 3);
  cerca(salida.z, -0.5 + Math.sin(c.jefe.face) * 0.35);
  primero.t = 1;
  sync(c, false, 0);
  const llegada = matrizInstancia(semillas);
  cerca(llegada.x, zonas[0].x);
  cerca(llegada.z, zonas[0].z);
  primero.t = vuelo; // devuelve el reloj de esa semilla a la simulación

  hasta(() => a.etapa === "activo");
  pasos(6); // 0,1 s para que las púas emerjan del suelo
  assert.equal(semillas.count, 0);
  assert.equal(sombras.count, 0);
  const [crateres] = mallas(scene, "CircleGeometry");
  assert.equal(crateres.count, zonas.length);
  const [puas] = mallas(scene, "ConeGeometry");
  const porZona = AJUSTE_ATAQUES.grano.puasPorZona;
  assert.equal(puas.count, zonas.length * porZona);
  const matriz = new THREE.Matrix4();
  const vertice = new THREE.Vector3();
  const vertices = puas.geometry.getAttribute("position");
  for (const [i, zona] of zonas.entries()) {
    const centro = matrizInstancia(crateres, i);
    cerca(centro.x, zona.x);
    cerca(centro.z, zona.z);
    for (let p = 0; p < porZona; p++) {
      puas.getMatrixAt(i * porZona + p, matriz);
      // El radio también contiene las puntas inclinadas, que sobresalen de su base.
      for (let v = 0; v < vertices.count; v++) {
        vertice.fromBufferAttribute(vertices, v).applyMatrix4(matriz);
        assert.ok(Math.hypot(vertice.x - zona.x, vertice.z - zona.z) <= zona.r);
      }
    }
  }
  const nuevo = reintentar(c);
  saltarPresentacion(nuevo);
  sync(nuevo);
  assert.equal(mallas(scene).length, 0); // se limpian las púas y los cráteres
});

test("reintentar durante Grano borra las semillas, sombras y trayectorias en vuelo", (t) => {
  const { a, c, scene, hasta, sync } = montar(t, "grano");
  hasta(() => a.t > a.T * 0.75);
  assert.equal(mallas(scene, "OctahedronGeometry").length, 2);
  assert.equal(mallas(scene, "CircleGeometry").length, 1);
  const nuevo = reintentar(c);
  saltarPresentacion(nuevo);
  sync(nuevo);
  assert.equal(mallas(scene).length, 0);
});

test("Hambre: las dos garras anticipan la dirección y el surco mide lo ya recorrido", (t) => {
  const { a, scene, hasta, pasos } = montar(t, "hambre");
  const [b] = a.bloques;
  pasos(30); // medio segundo de carga
  const garras = mallas(scene, "PlaneGeometry");
  assert.equal(garras.length, 2);
  for (const garra of garras) cerca(-garra.rotation.y, b.dir);
  assert.notEqual(garras[0].position.z, garras[1].position.z);
  hasta(() => a.etapa === "activo" && b.recorrido > 0.5);
  const marcas = mallas(scene, "PlaneGeometry");
  assert.equal(marcas.length, 1);
  const [surco] = marcas;
  cerca(surco.position.x, b.sx);
  cerca(surco.position.z, b.sz);
  cerca(surco.scale.x, b.recorrido);
});

test("Hambre: la cobertura acorta las garras y el origen del polvo hasta la marca real", (t) => {
  const { a, scene, pasos, polvo } = montar(t, "hambre", [
    { id: "estorbo", x: 2.6, z: 0, r: 0.75 }, // el cuerpo llega a 0,05 m antes de tocar el pilar
  ]);
  const [b] = a.bloques;
  const [zona] = b.zonas;
  cerca(zona.largo, 2.4); // el golpe todavía alcanza por delante del cuerpo
  pasos(57); // 0,95 s: las garras ya alcanzarían fuera de la marca sin el recorte
  assert.equal(a.etapa, "telegrafia");
  const garras = mallas(scene, "PlaneGeometry");
  assert.equal(garras.length, 2);
  for (const garra of garras) {
    assert.ok(garra.scale.x > 0);
    cerca(garra.position.x + garra.scale.x, zona.x + zona.largo);
  }
  assert.ok(polvo.length > 0);
  for (const { x, z } of polvo) {
    assert.ok(x >= zona.x && x + 0.2 <= zona.x + zona.largo + 1e-8);
    cerca(z, zona.z); // las bocanadas siguen el eje, dentro de ambas garras
  }
});

test("Enjambre: la nube persigue el círculo y conserva señal con movimiento reducido", (t) => {
  const { a, c, scene, huesos, sync, pasos, hasta } = montar(t, "enjambre");
  const [zona] = a.bloques[0].zonas;
  pasos(40); // la nube se forma antes de que se mueva el círculo
  const [langostas] = mallas(scene, "OctahedronGeometry");
  const total = AJUSTE_ATAQUES.enjambre.langostas;
  assert.equal(langostas.count, total);
  assert.ok(Math.abs(huesos.copa.quaternion.x) > 0.001); // la copa se sacude
  sync(c, true, 0); // mismo instante, con la opción de movimiento reducido
  assert.equal(langostas.count, Math.ceil(total * 0.6));
  cerca(huesos.copa.quaternion.x, 0); // la copa vuelve a su pose sin oscilación

  hasta(() => zona.etapa === "activa" && zona.x > 1);
  for (let i = 0; i < langostas.count; i++) {
    const p = matrizInstancia(langostas, i);
    assert.ok(Math.hypot(p.x - zona.x, p.z - zona.z) < zona.r);
  }
});

test("Banquete: se ve el tirón antes del círculo y los dientes marcan la mordida", (t) => {
  const { a, c, scene, hasta, pasos, sync } = montar(t, "banquete");
  const [tiron, mordida] = a.bloques;
  const [zona] = mordida.zonas;
  pasos(33); // 0,55 s: se ve la aspiración, aún sin aviso de mordida
  assert.equal(tiron.tirando, true);
  assert.equal(zona.etapa, "espera");
  assert.equal(mallas(scene, "ConeGeometry").length, 0);
  const [paja] = mallas(scene, "BoxGeometry");
  assert.equal(paja.count, AJUSTE_ATAQUES.banquete.briznas);
  matrizInstancia(paja);
  sync(c, true, 0);
  assert.equal(paja.count, AJUSTE_ATAQUES.banquete.briznas / 2);

  hasta(() => zona.etapa === "aviso" && zona.progreso > 0.4);
  const [dientes] = mallas(scene, "ConeGeometry");
  assert.equal(dientes.count, AJUSTE_ATAQUES.banquete.dientes);
  const diente = matrizInstancia(dientes);
  assert.ok(Math.hypot(diente.x - zona.x, diente.z - zona.z) <= zona.r);
  hasta(() => zona.etapa === "activa");
  assert.equal(paja.count, 0); // se detiene la aspiración al morder
  assert.equal(dientes.count, AJUSTE_ATAQUES.banquete.dientes);
});

test("los efectos se disipan al cancelar y se limpian al cambiar de combate", (t) => {
  const { c, scene, sync, pasos, hasta } = montar(t, "enjambre");
  hasta(() => c.jefe.accion?.etapa === "activo");
  assert.ok(mallas(scene, "OctahedronGeometry").length > 0);
  cancelarAccion(c.ctx, "prueba");
  sync();
  assert.ok(mallas(scene, "OctahedronGeometry").length > 0); // se permite la dispersión normal
  pasos(Math.ceil(AJUSTE_ATAQUES.enjambre.dispersa / dt) + 2);
  assert.equal(mallas(scene).length, 0);

  forzarAtaque(c, "hambre");
  hasta(() => c.jefe.accion?.bloques[0].recorrido > 0.5);
  assert.equal(mallas(scene, "PlaneGeometry").length, 1); // queda un surco activo
  assert.equal(mallas(scene, "ConeGeometry").length, 2); // los garfios también siguen activos
  const nuevo = reintentar(c);
  saltarPresentacion(nuevo);
  sync(nuevo); // la vista se reutiliza aunque cambie el combate
  assert.equal(mallas(scene).length, 0);
});

test("la victoria limpia la mordida y devuelve el abdomen a su pose de reposo", (t) => {
  const { a, c, scene, huesos, sync, hasta } = montar(t, "banquete");
  hasta(() => a.etapa === "recuperacion");
  assert.ok(huesos.abdomen.scale.x > 1);
  assert.equal(mallas(scene, "ConeGeometry").length, 1);
  ponerVidaJefe(c, 0);
  sync();
  assert.equal(c.estado, "victoria");
  assert.equal(mallas(scene).length, 0);
  cerca(huesos.abdomen.scale.x, 1);
});
