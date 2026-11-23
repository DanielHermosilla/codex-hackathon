import { expect, test } from "@playwright/test";

// Las pruebas avanzan el juego con `window.__game.step(n)`: pasos fijos de 1/60 s, sin depender del reloj real.

/** Junta errores de la página: cualquier excepción o request fallido hace fallar la prueba. */
function escucharErrores(page) {
  const errores = [];
  page.on("pageerror", (e) => errores.push("excepción: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errores.push("consola: " + m.text());
  });
  page.on("requestfailed", (r) => errores.push("request: " + r.url()));
  return errores;
}

/** Abre la página y espera el menú con la escena de fondo ya cargada. */
async function abrir(page, ruta = "/?seed=3") {
  await page.goto(ruta);
  await page.waitForFunction(() => window.__game?.pantalla === "menu", null, {
    timeout: 30000,
  });
}

/** Ejecuta pasos de juego dentro de la página. */
async function pasos(page, n) {
  await page.evaluate((k) => window.__game.step(k), n);
}

/** El centro de Odo coincide con el de la ventana y las otras dos columnas quedan a igual distancia. */
async function comprobarAyudaCentrada(page) {
  const centros = await page.locator(".lower > div").evaluateAll((grupos) =>
    grupos.map((grupo) => {
      const r = grupo.getBoundingClientRect();
      return r.left + r.width / 2 - window.innerWidth / 2;
    }),
  );
  expect(centros[1]).toBeCloseTo(0, 1);
  expect(centros[0]).toBeCloseTo(-centros[2], 1);
}

/** Lee una propiedad de `window.__game`. */
async function leer(page, f) {
  return page.evaluate(f);
}

/** Tipos de los eventos recientes de la partida. */
async function tipos(page) {
  return page.evaluate(() => window.__game.eventos.map((e) => e.tipo));
}

test("la dirección antigua de la pista abre AtaDos", async ({ page }) => {
  await abrir(page, "/pista.html");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Jugar" })).toBeVisible();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.getByText("Cómo jugar", { exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("link")).toHaveCount(0);
});

test("menú con el lobby → caída → pasillo → arco → Mirra con cinemática → victoria", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  const errores = escucharErrores(page);
  const foto = (nombre) =>
    page.screenshot({ path: info.outputPath(nombre + ".png") });

  // Menú: el lobby detrás (D-214), con las barras visibles y sin jugar aún.
  await abrir(page);
  expect(await leer(page, () => window.__game.escena)).toBe("recorrido");
  expect(await leer(page, () => window.__game.etapa)).toBe("caida");
  await expect(page.locator(".mast")).toBeVisible();
  await foto("01-menu");

  // Jugar: la caída empieza ahí mismo, sin pantalla de carga (D-205), y sin barras (D-200).
  await page.locator("#mode-coop").click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await expect(page.locator(".mast")).toBeHidden();
  await expect(page.locator(".lower")).toBeHidden();
  expect(await leer(page, () => window.__game.state.solo)).toBe(false);
  await pasos(page, 40);
  expect(
    await leer(page, () => window.__game.recorrido.caidaK),
  ).toBeGreaterThan(0);
  expect(await leer(page, () => window.__game.recorrido.caidaK)).toBeLessThan(
    1,
  );
  await foto("02-caida");

  // Aterrizan: polvo, temblor y la tarjeta «mover» (D-206).
  await pasos(page, 90);
  expect(await leer(page, () => window.__game.etapa)).toBe("recorrido");
  expect(await tipos(page)).toContain("caida:aterriza");
  await pasos(page, 30);
  expect(await leer(page, () => window.__game.tarjeta?.clave)).toBe("mover");
  await expect(page.locator("#hud-combate .barra")).toBeHidden(); // sin jefe no hay barra de vida
  await foto("03-lobby");

  // Pasillo: más tarjetas, enemigos despiertos y un mural.
  await page.evaluate(() => {
    window.__game.irA(30);
    window.__game.step(330);
  });
  const vistos = await page.evaluate(() =>
    window.__game.eventos
      .filter((e) => e.tipo === "tutorial:mostrar")
      .map((e) => e.clave),
  );
  expect(vistos).toContain("cortar"); // al menos una tarjeta más tras «mover»
  await page.evaluate(() => {
    window.__game.irA(33);
    window.__game.step(70);
  });
  const enemigos = await leer(page, () => window.__game.recorrido.enemigos);
  expect(enemigos.filter((e) => e.vivo).length).toBeGreaterThan(0);
  await foto("04-pasillo-enemigos");
  await page.evaluate(() => {
    window.__game.irA(60);
    window.__game.step(40);
  });
  expect(await tipos(page)).toContain("mural:activar");
  await foto("05-mural");

  // La cima: el arco entra en el encuadre.
  await page.evaluate(() => {
    window.__game.irA(178);
    window.__game.step(60);
  });
  await foto("06-arco");

  // Cruzar el arco: fundido a negro, la pradera carga y se abre en silencio (D-211, D-183).
  await page.evaluate(() => {
    window.__game.cruzarArco();
    window.__game.step(20);
  });
  expect(await leer(page, () => window.__game.etapa)).toBe("arco");
  expect(await leer(page, () => window.__game.fundido)).toBeGreaterThan(0);
  expect(await tipos(page)).toContain("jefe:preparar");
  await page.waitForFunction(() => window.__game.jefeCargado, null, {
    timeout: 30000,
  });
  await pasos(page, 30);
  expect(await leer(page, () => window.__game.escena)).toBe("jefe");
  await pasos(page, 150);
  expect(await leer(page, () => window.__game.etapa)).toBe("jefe");
  expect(await tipos(page)).toContain("jefe:entra");

  // Presentación con la cinemática de zoom y las franjas (solo la primera vez, D-213).
  await pasos(page, 70);
  const cine = await leer(page, () => window.__game.cinematica);
  expect(cine.partida).toBe(true);
  expect(cine.franjas).toBeGreaterThan(0.5);
  expect(await leer(page, () => window.__game.fundido)).toBe(0);
  await foto("07-cinematica");

  // Combate.
  await page.evaluate(() => {
    window.__game.saltarPresentacion();
    window.__game.step(40);
  });
  expect(await leer(page, () => window.__game.combate.estado)).toBe("pelea");
  await expect(page.locator("#hud-combate .barra")).toBeVisible();
  await foto("08-combate");

  // Victoria: lápida y luego la pantalla de resultado.
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.step(20);
    g.setVidaJefe(0);
    g.step(420);
  });
  await expect(
    page.getByRole("heading", { name: "Mirra ha caído" }),
  ).toBeVisible();
  await comprobarAyudaCentrada(page);
  await foto("10-victoria");
  // Volver a jugar deja el resultado y devuelve a ambos a la pradera, con la presentación corta.
  await page.getByRole("button", { name: "Volver a jugar" }).click();
  await pasos(page, 1);
  expect(await leer(page, () => window.__game.etapa)).toBe("jefe");
  expect(await leer(page, () => window.__game.combate.estado)).toBe(
    "presentacion",
  );
  expect(await leer(page, () => window.__game.cinematica.partida)).toBe(false);
  expect(errores).toEqual([]);
});

test("tras caer ambos ante Mirra, la única acción vuelve a la portada", async ({
  page,
}) => {
  await abrir(page, "/?seed=3&coop");
  await page.locator("#play").click();
  await page.evaluate(async () => {
    const g = window.__game;
    await g.saltarAlJefe();
    g.saltarPresentacion();
    g.matarJugadores();
    g.step(2);
  });
  await expect(
    page.getByRole("heading", { name: "Caísteis los dos" }),
  ).toBeFocused();
  await page.keyboard.press("Space");
  await page.keyboard.press("ShiftRight");
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.dispatchEvent(new window.Event("blur")));
  await pasos(page, 90);
  expect(await leer(page, () => window.__game.combate.estado)).toBe("derrota");
  await expect(page.getByRole("button")).toHaveText(["Volver al inicio"]);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Volver al inicio" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#play")).toBeFocused();
  expect(await leer(page, () => window.__game.escena)).toBe("recorrido");
});

test("cancelar el arco con la pradera visible devuelve al templo y permite cruzar de nuevo", async ({
  page,
}) => {
  const errores = escucharErrores(page);
  await abrir(page, "/?dev&seed=3");
  await page.locator("#play").click();
  await page.evaluate(() => {
    window.__game.saltarCaida();
    window.__game.cruzarArco();
    window.__game.step(1); // detiene el reloj real durante la carga de la pradera
  });
  await page.waitForFunction(() => window.__game.jefeCargado);
  await pasos(page, 60); // un segundo: termina el fundido pero continúa el silencio del arco
  expect(await leer(page, () => window.__game.escena)).toBe("jefe");
  expect(await leer(page, () => window.__game.etapa)).toBe("arco");
  await page.keyboard.press("KeyT"); // reinicio de depuración con el canvas enfocado
  await pasos(page, 2);
  expect(await leer(page, () => window.__game.escena)).toBe("recorrido");
  expect(await leer(page, () => window.__game.etapa)).toBe("recorrido");
  expect(await leer(page, () => window.__game.fundido)).toBe(0);
  await page.evaluate(() => {
    window.__game.cruzarArco();
    window.__game.step(180); // tres segundos: alcanza la presentación tras el segundo cruce
  });
  expect(await leer(page, () => window.__game.etapa)).toBe("jefe");
  expect(await leer(page, () => window.__game.escena)).toBe("jefe");
  expect(errores).toEqual([]);
});

test("Mirra: ataque con telegrafía y segunda fase", async ({ page }, info) => {
  test.setTimeout(120000);
  const errores = escucharErrores(page);
  await abrir(page);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await page.evaluate(() => window.__game.saltarAlJefe());
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.step(20);
    g.forzarAtaque("siega");
    g.step(30);
  });
  expect(await tipos(page)).toContain("telegrafia_inicio");
  await expect(page.locator("#objective")).toContainText("Siega");
  await page.screenshot({ path: info.outputPath("11-mirra-siega.png") });
  await page.evaluate(() => {
    window.__game.setVidaJefe(window.__game.combate.jefe.vidaMax * 0.4);
    window.__game.step(200);
  });
  expect((await leer(page, () => window.__game.combate)).jefe.fase).toBe(2);
  await page.screenshot({ path: info.outputPath("12-mirra-fase2.png") });
  expect(errores).toEqual([]);
});

test("Mirra intercala y dibuja los cuatro avisos de arena", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errores = escucharErrores(page);
  await abrir(page, "/?seed=3&dev");
  await page.getByRole("button", { name: "Jugar" }).click();
  await page.evaluate(async () => {
    const g = window.__game;
    g.step(1); // detiene el reloj real: la secuencia avanza solo en los pasos de la prueba
    await g.saltarAlJefe();
    g.saltarPresentacion();
    g.step(270); // a los cuatro segundos aparece el primer aviso
  });
  for (const [id, aviso] of [
    ["acido", "Ácido"],
    ["luz", "Luz divina"],
    ["pisoton", "Pisotón"],
    ["braseros", "brasero rojo"],
  ]) {
    await expect(page.locator("#objective")).toContainText(aviso);
    await page.screenshot({ path: info.outputPath(id + ".png") });
    if (id === "braseros") {
      const rito = await leer(page, () => window.__game.combate.rito);
      expect(rito.braseros.map((f) => f.color)).toEqual([0, 1, 2]);
    } else {
      // Mantiene abierta la pelea para fotografiar el siguiente rito aun si un personaje cayó.
      await page.keyboard.press("KeyR");
      await pasos(page, 480); // ocho segundos entre señales en la rotación de Mirra
    }
  }
  expect(errores).toEqual([]);
});

test("el Farolero enseña las tres pruebas y anuncia el resultado de cada una", async ({
  page,
}, info) => {
  const errores = escucharErrores(page);
  await abrir(page, "/?jefe=farolero&seed=17");
  await expect(page.locator("#intro")).toContainText("primera vuelta");
  await page.locator("#mode-coop").click();
  await page.getByRole("button", { name: "Enfrentar al Farolero" }).click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await page.evaluate(() => {
    window.__game.saltarPresentacion();
    window.__game.step(1);
  });
  await expect(page.locator("#farol-estado")).toContainText("Prisma");
  await expect(page.locator("#farol-instruccion")).toContainText(
    "lados opuestos",
  );
  await expect(page.locator("#farol-vuelta")).toContainText("sin recibir daño");
  await expect(
    page.getByRole("progressbar", { name: "Tiempo restante" }),
  ).toBeVisible();
  // Cruza el cristal con los dos extremos de la cadena. Se avanza lo que marque el propio aviso.
  await page.evaluate(() => {
    const g = window.__game;
    const f = g.combate.farolero;
    const { x, z } = f.marcas[0];
    g.colocar({ sael: [x - 2, z], odo: [x + 2, z] });
    g.step(Math.ceil(f.restante * 60) + 3);
  });
  await expect(page.locator("#farol-estado")).toHaveText("Prisma · acierto");
  await expect(
    page.getByRole("progressbar", { name: "Tiempo restante" }),
  ).toBeHidden();

  // Los ecos sí vencen al quedarse quieto. En la primera vuelta conservamos la vida.
  async function avanzarEtapa() {
    await page.evaluate(() => {
      const g = window.__game;
      g.step(Math.ceil(g.combate.farolero.restante * 60) + 1);
    });
  }
  await avanzarEtapa();
  await expect(page.locator("#farol-instruccion")).toContainText(
    "todos los círculos",
  );
  await page.screenshot({ path: info.outputPath("farolero-ecos.png") });
  const salud = await page.evaluate(() =>
    window.__game.state.players.map((p) => p.hp),
  );
  await avanzarEtapa();
  await avanzarEtapa();
  await expect(page.locator("#farol-estado")).toContainText(
    "se acabó el tiempo",
  );
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual(salud);
  await avanzarEtapa();
  await expect(page.locator("#farol-instruccion")).toContainText("campana 1");
  await avanzarEtapa();
  await page.evaluate(() => {
    const g = window.__game;
    const { x, z } = g.combate.farolero.marcas[0];
    g.colocar({ sael: [x, z], odo: [x + 2, z] });
    g.step(1);
  });
  await expect(page.locator("#farol-instruccion")).toContainText("campana 2");
  await page.screenshot({ path: info.outputPath("farolero-campanas.png") });
  await page.locator("#pause").click();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  const ajustes = page.getByRole("dialog", { name: "Ajustes" });
  await expect(ajustes.getByText(/quien sigue en pie/)).toBeVisible();
  const brillo = ajustes.getByLabel("Brillo de la arena");
  const avisos = ajustes.getByRole("checkbox", { name: /Avisos sonoros/ });
  await brillo.selectOption("0.25");
  await avisos.uncheck();
  await expect(brillo).toHaveValue("0.25");
  await expect(avisos).not.toBeChecked();
  expect(errores).toEqual([]);
});

test("Mirra fija el escupitajo junto al barril y el ácido apaga la mecha", async ({
  page,
}, info) => {
  const errores = escucharErrores(page);
  await abrir(page, "/?jefe=mirra&seed=17");
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  const aviso = await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.step(245); // El primer especial empieza cuatro segundos después de la presentación.
    return g.combate.arenaMirra;
  });
  expect(aviso.acido.etapa).toBe("punteria");
  expect(aviso.acido.cubreBarril).toBe(false);
  await expect(page.locator("#objective")).toContainText(/barril/i);
  await expect(page.locator("#objective")).toContainText(
    aviso.acido.objetivo === 0 ? "Sael" : "Odo",
  );

  await page.evaluate(() => {
    const g = window.__game;
    const { barril, acido } = g.combate.arenaMirra;
    const marcado = g.state.players[acido.objetivo];
    const rumbo = Math.atan2(marcado.z - barril.z, marcado.x - barril.x);
    // Lleva a la pareja al borde más próximo del barril, con espacio para salir juntos.
    const dx = Math.cos(rumbo),
      dz = Math.sin(rumbo);
    const sitio = [barril.x + dx * 1.6, barril.z + dz * 1.6];
    const alLado = [sitio[0] + dz * 1.3, sitio[1] - dx * 1.3];
    g.colocar(
      acido.objetivo === 0
        ? { sael: sitio, odo: alLado }
        : { sael: alLado, odo: sitio },
    );
    g.step(1);
  });
  expect(
    (await page.evaluate(() => window.__game.combate.arenaMirra.acido))
      .cubreBarril,
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("mirra-punteria.png") });
  const disparo = await page.evaluate(() => {
    const g = window.__game;
    const marca = g.combate.arenaMirra.acido;
    g.step(Math.ceil((marca.duracion - marca.t) * 60) + 12);
    return g.combate.arenaMirra.acido;
  });
  expect(disparo.etapa).toBe("vuelo");
  expect(disparo.tiro.y).toBeGreaterThan(0.5);
  await page.screenshot({ path: info.outputPath("mirra-escupitajo.png") });
  const resultado = await page.evaluate(() => {
    const g = window.__game;
    const { barril, acido } = g.combate.arenaMirra;
    const dx = acido.x - barril.x,
      dz = acido.z - barril.z;
    g.setInput(0, { mx: dx, mz: dz });
    g.setInput(1, { mx: dx, mz: dz });
    g.step(Math.ceil((acido.duracion - acido.t) * 60) + 2);
    g.clearInput();
    return g.combate.arenaMirra;
  });
  expect(resultado.resultadoAcido.tipo).toBe("apagado");
  expect(resultado.barril).toBeNull();
  expect(resultado.charcos).toHaveLength(1);
  expect(resultado.charcos[0].x).toBeCloseTo(disparo.x);
  expect(resultado.charcos[0].z).toBeCloseTo(disparo.z);
  await expect(page.locator("#objective")).toContainText(/mecha|apag/i);
  await page.screenshot({ path: info.outputPath("mirra-pozo.png") });
  expect(errores).toEqual([]);
});

test("la pausa y el cambio de foco sueltan los controles", async ({ page }) => {
  const errores = escucharErrores(page);
  // Un sitio que incrusta el juego puede bloquear los mandos: el teclado y el HUD deben seguir funcionando.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "getGamepads", {
      value() {
        throw new window.DOMException("Gamepad bloqueado", "SecurityError");
      },
    });
  });
  await abrir(page);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await page.evaluate(() => window.__game.saltarCaida()); // en el aire no se camina
  await expect(page.locator("#arena")).toBeFocused();
  const x0 = await page.evaluate(() => window.__game.state.players[0].x);
  await page.keyboard.down("KeyD");
  await pasos(page, 20);
  const x1 = await page.evaluate(() => window.__game.state.players[0].x);
  expect(x1).toBeGreaterThan(x0);
  // Al salir del canvas la tecla se suelta aunque siga apretada: frena (con su inercia) y se detiene.
  await page.keyboard.press("Space"); // el toque sigue pendiente de su primer paso de simulación
  await page.locator("#pause").focus(); // las barras ya no se ven al jugar: el botón de pausa del HUD sí
  await pasos(page, 1);
  expect(
    await leer(page, () => window.__game.state.players.some((p) => p.dashing)),
  ).toBe(false);
  await pasos(page, 39);
  const x2 = await page.evaluate(() => window.__game.state.players[0].x);
  await pasos(page, 20);
  expect(
    await page.evaluate(() => window.__game.state.players[0].x),
  ).toBeCloseTo(x2, 2);
  await page.keyboard.up("KeyD");
  // Perder el foco de la ventana pausa y congela la simulación.
  await page.evaluate(() => window.dispatchEvent(new window.Event("blur")));
  expect(await page.evaluate(() => window.__game.pantalla)).toBe("paused");
  const t = await page.evaluate(() => window.__game.state.time);
  await pasos(page, 30);
  expect(await page.evaluate(() => window.__game.state.time)).toBe(t);
  await page.locator("#primary").click();
  await expect(page.locator("#arena")).toBeFocused();
  // En modo solo, Espacio hace dashear a los dos.
  await page.keyboard.down("Space");
  await pasos(page, 2);
  await page.keyboard.up("Space");
  const dash = await page.evaluate(() =>
    window.__game.state.players.map((p) => p.dashing),
  );
  expect(dash).toEqual([true, true]);
  expect(errores).toEqual([]);
});

test("sin barras al jugar: el canvas mide lo mismo que la ventana", async ({
  page,
}, info) => {
  // En CI las tres capturas se dibujan con WebGL por software.
  test.setTimeout(90000);
  const errores = escucharErrores(page);
  /** Mide el canvas, la ventana y el scroll de la página. */
  const medir = () =>
    page.evaluate(() => {
      const c = document.getElementById("arena")?.getBoundingClientRect();
      return {
        canvas: { x: c?.x, y: c?.y, w: c?.width, h: c?.height },
        ventana: { w: window.innerWidth, h: window.innerHeight },
        scroll: {
          w: document.documentElement.scrollWidth,
          h: document.documentElement.scrollHeight,
        },
      };
    });
  /** Comprueba que el canvas cubre toda la ventana, sin márgenes ni scroll. */
  const esperarPantallaCompleta = async () => {
    const m = await medir();
    expect(m.canvas).toEqual({ x: 0, y: 0, w: m.ventana.w, h: m.ventana.h });
    expect(m.scroll.w).toBeLessThanOrEqual(m.ventana.w);
    expect(m.scroll.h).toBeLessThanOrEqual(m.ventana.h);
  };

  await abrir(page);
  await pasos(page, 1); // congela el fondo 3D mientras se miden las barras y se capturan las pantallas
  // Menú: las barras se ven sobre el canvas, que ya ocupa toda la ventana.
  await expect(page.locator(".mast")).toBeVisible();
  await expect(page.locator(".lower")).toBeVisible();
  await esperarPantallaCompleta();
  await page.screenshot({ path: info.outputPath("13-menu-barras.png") });
  // En horizontal bajo, el botón Jugar debe quedar por encima de los controles centrados.
  await page.setViewportSize({ width: 667, height: 375 });
  const jugar = await page.locator("#play").boundingBox();
  const barra = await page.locator(".lower").boundingBox();
  const modos = await page.locator("#modes").boundingBox();
  expect(jugar.y + jugar.height).toBeLessThanOrEqual(barra.y);
  expect(modos.x).toBeCloseTo(jugar.x, 1);
  expect(modos.width).toBeCloseTo(jugar.width, 1);
  await comprobarAyudaCentrada(page);
  await page.setViewportSize({ width: 960, height: 720 });

  // Jugando: sin barras y el canvas no cambia de tamaño; la pausa sigue en el HUD.
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await pasos(page, 40); // captura siempre el mismo instante de la caída
  await expect(page.locator(".mast")).toBeHidden();
  await expect(page.locator(".lower")).toBeHidden();
  await esperarPantallaCompleta();
  await expect(page.locator("#hud #pause")).toBeVisible();
  await page.screenshot({ path: info.outputPath("14-jugando-sin-barras.png") });

  // Pausa: vuelven las barras sin que el canvas cambie, y Controles abre su diálogo.
  await page.locator("#pause").click();
  await page.waitForFunction(() => window.__game.pantalla === "paused");
  await expect(page.locator(".mast")).toBeVisible();
  await expect(page.locator(".lower")).toBeVisible();
  await esperarPantallaCompleta();
  await expect(page.locator("#intro")).toBeHidden();
  const botones = page.locator(".actions button:visible");
  await expect(botones).toHaveText([
    "Continuar",
    "Reintentar",
    "Volver al inicio",
  ]);
  const [continuar, reintentar, inicio] = await botones.evaluateAll(
    (elementos) =>
      elementos.map((e) => {
        const r = e.getBoundingClientRect();
        return {
          x: r.x,
          y: r.y,
          alto: r.height,
          ancho: r.width,
          fuente: window.getComputedStyle(e).font,
        };
      }),
  );
  for (const boton of [reintentar, inicio]) {
    expect(boton.x).toBe(continuar.x);
    expect(boton.ancho).toBe(continuar.ancho);
    expect(boton.fuente).toBe(continuar.fuente);
  }
  expect(reintentar.y).toBeGreaterThanOrEqual(continuar.y + continuar.alto);
  expect(inicio.y).toBeGreaterThanOrEqual(reintentar.y + reintentar.alto);
  await comprobarAyudaCentrada(page);
  await page.screenshot({ path: info.outputPath("15-pausa-barras.png") });
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await expect(page.locator("#controls")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#controls")).toBeHidden();

  // En pantalla estrecha tampoco reaparecen márgenes ni scroll al jugar.
  await page.setViewportSize({ width: 390, height: 700 });
  await page.locator("#primary").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await expect(page.locator(".mast")).toBeHidden();
  await esperarPantallaCompleta();
  expect(errores).toEqual([]);
});

test("explica cómo recuperar WebGL cuando no se puede dibujar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type === "webgl2" ? null : original.call(this, type, ...args);
    };
  });
  await page.goto("/");
  await expect(page.getByRole("alert")).toContainText("WebGL 2");
  await expect(page.locator("#arena")).toBeHidden();
});

test("Start en el segundo mando arranca en cooperativo y cada mando mueve a su personaje", async ({
  page,
}) => {
  // Dos mandos estándar virtuales ejercitan el mismo lector que los mandos físicos.
  await page.addInitScript(() => {
    const pads = [0, 1].map((index) => ({
      index,
      axes: [0, 0, 0, 0],
      buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 })),
    }));
    Object.defineProperty(window.navigator, "getGamepads", {
      value: () => pads,
      configurable: true,
    });
    window.testPads = pads;
  });
  await abrir(page);
  await page.evaluate(() => {
    window.testPads[1].buttons[9].pressed = true;
  });
  await pasos(page, 1);
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  expect(await page.evaluate(() => window.__game.state.solo)).toBe(false);
  await page.evaluate(() => window.__game.saltarCaida()); // en el aire no se camina
  await page.evaluate(() => {
    window.testPads[1].buttons[9].pressed = false;
    window.testPads[1].axes[0] = 1; // Odo hacia la derecha
    window.testPads[0].buttons[7] = { pressed: true, value: 1 }; // Sael se ancla con el gatillo
  });
  const antes = await page.evaluate(() => window.__game.state.players);
  await pasos(page, 20);
  const despues = await page.evaluate(() => window.__game.state.players);
  expect(despues[1].x).toBeGreaterThan(antes[1].x);
  expect(despues[0].anchored).toBe(true);

  // Desenchufar el primer mando deja el segundo con Odo, incluso tras editar el teclado.
  await page.evaluate(() => {
    window.testPads[0] = null;
  });
  await pasos(page, 2);
  await page.locator("#pause").click();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.getByRole("button", { name: /Sael · Derecha/ }).click();
  await page.keyboard.press("KeyL");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continuar" }).click();
  // El ancla identifica al dueño del mando aunque la cadena arrastre al compañero.
  await page.evaluate(() => {
    window.testPads[1].axes[0] = 0;
    window.testPads[1].buttons[7] = { pressed: true, value: 1 };
  });
  await pasos(page, 2);
  const anclas = await page.evaluate(() =>
    window.__game.state.players.map((p) => p.anchored),
  );
  expect(anclas).toEqual([false, true]);
});

test("el engranaje guarda el volumen y las teclas, y el recorrido los usa", async ({
  page,
}) => {
  await abrir(page);
  const ajustes = page.getByRole("button", { name: "Ajustes", exact: true });
  await ajustes.click();
  const panel = page.getByRole("dialog", { name: "Ajustes" });
  const volumen = panel.getByRole("slider", { name: "Volumen general" });
  await volumen.focus();
  await page.keyboard.press("Home");
  await expect(volumen).toHaveValue("0");
  await expect
    .poll(() => page.evaluate(() => window.__game.audio.volumenes.master))
    .toBe(0);
  await page.keyboard.press("ArrowRight");
  await expect(volumen).toHaveValue("1");
  const derecha = panel.getByRole("button", { name: /Sael · Derecha/ });
  await derecha.click();
  await page.keyboard.press("ArrowUp");
  await expect(panel.getByRole("status").last()).toContainText(
    "Ya está en uso",
  );
  await page.keyboard.press("Escape");
  await expect(panel).toBeVisible();
  await expect(derecha).toHaveText("D");
  await derecha.press("Enter");
  await page.keyboard.press("KeyL");
  await expect(derecha).toHaveText("L");
  await page.reload();
  await page.waitForFunction(() => window.__game?.pantalla === "menu");
  await ajustes.click();
  await expect(derecha).toHaveText("L");
  await expect(volumen).toHaveValue("1");
  await page.keyboard.press("Escape");
  await expect(ajustes).toBeFocused();
  await page.getByRole("button", { name: "Jugar" }).click();
  await expect(page.locator("#arena")).toBeFocused();
  await page.evaluate(() => window.__game.saltarCaida());
  await pasos(page, 24);
  const teclasTarjeta = page.locator(".tarjeta .teclas");
  await expect(teclasTarjeta).toContainText("WASL");
  const leerX = () => page.evaluate(() => window.__game.state.players[0].x);
  const inicio = await leerX();
  await page.keyboard.down("KeyD");
  await pasos(page, 15);
  await page.keyboard.up("KeyD");
  expect(await leerX()).toBeCloseTo(inicio, 3);
  await page.keyboard.down("KeyL");
  await pasos(page, 15);
  expect(await leerX()).toBeGreaterThan(inicio);
  await page.locator("#pause").click();
  await ajustes.click();
  await page.keyboard.up("KeyL");
  await expect(volumen).toHaveValue("1");
  expect(await page.evaluate(() => window.__game.audio.volumenes.master)).toBe(
    0,
  );
  await panel.getByRole("button", { name: "Restablecer teclas" }).click();
  await expect(derecha).toHaveText("D");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continuar" }).click();
  await pasos(page, 1);
  await expect(teclasTarjeta).toContainText("WASD");
  expect(await page.evaluate(() => window.__game.audio.volumenes.master)).toBe(
    0.01,
  );
});
