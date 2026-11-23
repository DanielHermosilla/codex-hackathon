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

test("menú → práctica con el cartel → Mirra → victoria", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errores = escucharErrores(page);
  await abrir(page);
  await page.screenshot({ path: info.outputPath("01-menu.png") });
  await page.locator("#mode-coop").click();
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");

  // El cartel conserva el diálogo de la práctica y lleva solo el nombre del carro.
  const mural = page.locator("#mural");
  await expect(mural).toContainText("Carro de completos");
  await expect(mural).toContainText("31 minutos");
  await expect(mural).toContainText("completo italiano");
  await expect(mural).toContainText("quiero un puro completo");
  await expect(mural).not.toContainText("23");
  await expect(mural.getByAltText("Codex")).toHaveCount(0);

  // Un corte real: separarse hasta tensar la cadena y barrer tirando hacia afuera.
  await page.evaluate(() => {
    const g = window.__game;
    g.setInput(0, { mx: -1 });
    g.setInput(1, { mx: 1 });
    g.step(50);
    g.setInput(0, { mx: -0.5, mz: -1 });
    g.setInput(1, { mx: 0.5, mz: -1 });
    g.step(120);
    g.clearInput();
  });
  const practica = await page.evaluate(() => window.__game.combate);
  expect(practica.solo).toBe(false);
  expect(practica.jefe.vida).toBeLessThan(practica.jefe.vidaMax);
  await page.screenshot({ path: info.outputPath("02-practica.png") });

  // Al caer el muñeco aparece «Primer corte» y se pasa a Mirra.
  await page.evaluate(() => window.__game.setVidaJefe(0));
  await pasos(page, 120);
  await expect(
    page.getByRole("heading", { name: "Primer corte" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Enfrentar a Mirra" }).click();
  await page.waitForFunction(
    () =>
      window.__game.pantalla === "playing" && window.__game.etapa === "mirra",
  );
  await pasos(page, 90);
  await page.screenshot({ path: info.outputPath("03-mirra-presentacion.png") });

  // Un ataque con telegrafía: el aviso llega como evento (audio) y se ve en el suelo.
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.step(20);
    g.forzarAtaque("siega");
    g.step(30);
  });
  const eventos = await page.evaluate(() =>
    window.__game.eventos.map((e) => e.tipo),
  );
  expect(eventos).toContain("telegrafia_inicio");
  await expect(page.locator("#objective")).toContainText("Siega");
  await page.screenshot({ path: info.outputPath("04-mirra-siega.png") });

  // Segunda fase: bajar la vida a la mitad dispara la transición.
  await page.evaluate(() => {
    window.__game.setVidaJefe(500);
    window.__game.step(200);
  });
  expect((await page.evaluate(() => window.__game.combate)).jefe.fase).toBe(2);
  await page.screenshot({ path: info.outputPath("05-mirra-fase2.png") });

  // Victoria: lápida y luego la pantalla de resultado.
  await page.evaluate(() => {
    window.__game.setVidaJefe(0);
    window.__game.step(420);
  });
  await expect(
    page.getByRole("heading", { name: "Mirra ha caído" }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("06-victoria.png") });
  expect(errores).toEqual([]);
});

test("la pausa y el cambio de foco sueltan los controles", async ({ page }) => {
  const errores = escucharErrores(page);
  await abrir(page);
  await page.locator("#play").click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await expect(page.locator("#arena")).toBeFocused();
  const x0 = await page.evaluate(() => window.__game.state.players[0].x);
  await page.keyboard.down("KeyD");
  await pasos(page, 20);
  const x1 = await page.evaluate(() => window.__game.state.players[0].x);
  expect(x1).toBeGreaterThan(x0);
  // Al salir del canvas la tecla se suelta aunque siga apretada: frena (con su inercia) y se detiene.
  await page.locator("#sound").focus();
  await pasos(page, 40);
  const x2 = await page.evaluate(() => window.__game.state.players[0].x);
  await pasos(page, 20);
  expect(
    await page.evaluate(() => window.__game.state.players[0].x),
  ).toBeCloseTo(x2, 2);
  await page.keyboard.up("KeyD");
  // Perder el foco de la ventana pausa y congela la simulación.
  await page.evaluate(() => window.dispatchEvent(new window.Event("blur")));
  expect(await page.evaluate(() => window.__game.pantalla)).toBe("paused");
  const t = await page.evaluate(() => window.__game.combate.t);
  await pasos(page, 30);
  expect(await page.evaluate(() => window.__game.combate.t)).toBe(t);
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
  expect((await page.evaluate(() => window.__game.combate)).solo).toBe(false);
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
});
