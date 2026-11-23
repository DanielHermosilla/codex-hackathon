import { expect, test } from "@playwright/test";

// Lleva a la pareja caminando hasta el punto indicado. La física y el límite de la zona siguen activos.
async function caminarHasta(page, destino) {
  await page.evaluate(({ x, z }) => {
    const juego = window.__game;
    // A 60 pasos/s, tres segundos bastan para cruzar el tramo de la tienda.
    for (let n = 0; n < 180; n += 6) {
      const jugadores = juego.state.players;
      const medioX = (jugadores[0].x + jugadores[1].x) / 2;
      const medioZ = (jugadores[0].z + jugadores[1].z) / 2;
      const dx = x - medioX,
        dz = z - medioZ;
      const distancia = Math.hypot(dx, dz);
      if (distancia < 0.6) break;
      // Ambos caminan en paralelo; para probar la carta basta que uno alcance la ventanilla.
      for (const i of [0, 1])
        juego.setInput(i, { mx: dx / distancia, mz: dz / distancia });
      juego.step(6);
    }
    juego.clearInput();
    juego.step(1);
  }, destino);
}

test("el único carro llega a la arena con el premio y las compras duran hasta el Farolero", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errores = [];
  page.on("pageerror", (error) => errores.push(error.message));
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text());
  });
  await page.goto("/?seed=3");
  await page.waitForFunction(() => window.__game?.pantalla === "menu");
  const jugar = page.getByRole("button", { name: "Jugar" });
  const aviso = page.locator("#aviso-puesto");
  const carta = page.getByRole("dialog", {
    name: "Carro de completos de Bodoque",
  });
  await expect(jugar).toBeVisible();
  // La portada define las dos familias que deben acompañar al jugador hasta el carro.
  const titulo = await page
    .locator("#title")
    .evaluate((el) => window.getComputedStyle(el).fontFamily);
  const lectura = await page
    .locator("#intro")
    .evaluate((el) => window.getComputedStyle(el).fontFamily);
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();
  await jugar.click();
  await page.waitForFunction(() => window.__game?.pantalla === "playing");
  await page.keyboard.press("p");
  await expect(aviso).toBeHidden();
  await expect(carta).toBeHidden();

  // En el antiguo lugar del carro, P ya no permite comprar.
  await page.evaluate(() => window.__game.step(100));
  await caminarHasta(page, { x: 8.5, z: -6 });
  await page.keyboard.press("p");
  await expect(aviso).toBeHidden();
  await expect(carta).toBeHidden();
  expect(await page.evaluate(() => window.__game.tienda)).toEqual({
    carro: null,
    saldo: 0,
  });

  await page.evaluate(async () => {
    const g = window.__game;
    await g.saltarAlJefe();
    g.saltarPresentacion();
    g.colocar({ sael: [-1.5, 2.8], odo: [1.5, 2.8], jefe: [-4, 0] });
    g.step(2);
  });
  expect(
    await page.evaluate(() => window.__game.render.carroVictoria),
  ).toBeNull();
  expect(await page.evaluate(() => window.__game.render.monedasVisibles)).toBe(
    0,
  );
  await page.evaluate(() => {
    const g = window.__game;
    g.setVidaJefe(0);
    g.step(30); // medio segundo: las monedas caen y el carro todavía viene en camino
  });
  const llegada = await page.evaluate(() => window.__game.render);
  expect(llegada.monedasVisibles).toBeGreaterThan(0);
  expect(llegada.carroVictoria.x).toBeGreaterThan(0);
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();
  await page.screenshot({ path: info.outputPath("llegada-bodoque.png") });

  await page.evaluate(() => window.__game.step(120));
  expect(await page.evaluate(() => window.__game.render.carroVictoria)).toEqual(
    { x: 0, z: 0 },
  );
  await expect(page.locator("#objective")).toContainText("+25 pesos");
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("P");
  const mural = page.locator("#mural");
  await expect(mural).toHaveAttribute(
    "aria-label",
    "Carro de completos de Bodoque",
  );
  await expect(mural).toContainText("31 minutos");
  await expect(mural).toContainText("quiero un puro completo");
  await expect(aviso).toHaveCSS("font-family", titulo);
  await expect(mural.locator("dt").first()).toHaveCSS("font-family", titulo);
  await expect(mural.locator("dd").first()).toHaveCSS("font-family", lectura);
  await expect(page.locator(".hud .lapida .despedida")).toHaveCSS(
    "font-family",
    lectura,
  );
  await page.screenshot({ path: info.outputPath("aviso.png") });
  const ventana = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 640 });
  // A este ancho el diálogo y la indicación de salida comparten la esquina inferior.
  const cartel = await mural.boundingBox();
  const objetivo = await page.locator("#objective").boundingBox();
  const lapida = await page.locator(".hud .lapida.con-carro").boundingBox();
  expect(lapida.y + lapida.height).toBeLessThanOrEqual(cartel.y);
  expect(cartel.x + cartel.width).toBeLessThanOrEqual(objetivo.x);
  await page.screenshot({ path: info.outputPath("aviso-angosto.png") });
  await page.setViewportSize(ventana);
  await page.keyboard.press("p");
  await expect(carta).toBeVisible();
  expect(await carta.boundingBox()).toEqual({
    x: 0,
    y: 0,
    ...page.viewportSize(),
  });
  await expect(carta.getByRole("listitem")).toHaveCount(3);
  await expect(carta.locator(".carta-detalle button").first()).toHaveCSS(
    "font-family",
    titulo,
  );
  await expect(carta.locator(".carta-detalle p").first()).toHaveCSS(
    "font-family",
    lectura,
  );
  await expect
    .poll(() =>
      carta
        .locator("img")
        .evaluateAll((imgs) => imgs.filter((i) => i.naturalWidth > 0).length),
    )
    .toBe(3);
  const saldo = carta.locator(".carta-saldo");
  await expect(saldo).toHaveText("25 pesos");
  await expect(
    carta.getByRole("button", {
      name: "Comprar · Mote con huesillos · 25 pesos",
    }),
  ).toBeEnabled();
  await expect(
    carta.getByRole("button", { name: "Comprar · Sopaipilla · 23 pesos" }),
  ).toBeEnabled();
  await page.screenshot({ path: info.outputPath("carta.png") });
  // En una ventana angosta la carta desplaza hacia abajo, sin cortar las fichas a los lados.
  await page.setViewportSize({ width: 390, height: 640 });
  await expect
    .poll(() => carta.evaluate((el) => el.scrollWidth - el.clientWidth))
    .toBe(0);
  await page.screenshot({ path: info.outputPath("carta-angosta.png") });
  const ultimaFicha = carta.getByRole("listitem").last();
  await ultimaFicha.scrollIntoViewIfNeeded();
  await expect(ultimaFicha).toBeInViewport();
  await page.setViewportSize(ventana);
  const antes = await page.evaluate(() => window.__game.state.time);
  await page.evaluate(() => window.__game.step(120));
  expect(await page.evaluate(() => window.__game.state.time)).toBe(antes);
  const volver = carta.getByRole("button", { name: "Volver al juego" });
  await expect(volver).toBeFocused();
  await page.keyboard.press("d"); // la primera opción de la carta es el completo
  await expect(
    carta.getByRole("button", {
      name: "Comprar · Completo italiano · 25 pesos",
    }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(saldo).toHaveText("0 pesos");
  await expect(
    carta.getByRole("button", { name: "Comprado · Completo italiano" }),
  ).toBeDisabled();
  await expect(carta.locator(".carta-detalle button:disabled")).toHaveCount(3);
  await expect(volver).toBeFocused(); // ya no se puede comprar; la salida queda seleccionada
  await page.keyboard.press("ShiftLeft");
  await expect(carta).toBeHidden();
  await expect(page.locator("#arena")).toBeFocused();
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1250, 1250]);
  // La carta quedó abierta tras comprar y congeló el reloj. Ahora empieza la espera.
  await page.evaluate(() => window.__game.step(179));
  expect(await page.evaluate(() => window.__game.etapa)).toBe("victoria");
  await page.evaluate(() => window.__game.step(1));
  await page.waitForFunction(
    () =>
      window.__game.etapa === "epilogo" &&
      window.__game.pantalla === "cinematica" &&
      window.__game.escena === "jefe",
  );
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1250, 1250]);
  expect(await page.evaluate(() => window.__game.combate)).toBeNull();
  await page.evaluate(() => window.__game.step(64));
  await expect(page.locator("#hud")).toBeHidden();
  await expect(page.locator(".hud")).toBeHidden();
  await page.screenshot({ path: info.outputPath("farolero-umbral.png") });
  // Una pausa detiene el reloj del plano y permite seguir viendo la entrada.
  const instante = await page.evaluate(() => window.__game.tEtapa);
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__game.step(120));
  expect(await page.evaluate(() => window.__game.tEtapa)).toBe(instante);
  await expect(page.locator("#restart")).toBeHidden();
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.evaluate(() => window.__game.step(280));
  await page.screenshot({ path: info.outputPath("farolero-revelado.png") });
  await page.evaluate(() => window.__game.step(540));
  await expect(
    page.getByRole("heading", { name: "Continuará..." }),
  ).toBeFocused();
  await expect(page.locator("#primary")).toBeHidden();
  expect(await page.evaluate(() => window.__game.combate)).toBeNull();
  await page.screenshot({ path: info.outputPath("farolero-continuara.png") });
  // El botón vuelve a la portada. La siguiente partida empieza sin las compras previas.
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await page.waitForFunction(() => window.__game.pantalla === "menu");
  await jugar.click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1000, 1000]);
  expect(errores).toEqual([]);
});

test("se puede reintentar la carga del epílogo después de comprar", async ({
  page,
}) => {
  await page.goto("/?jefe=mirra&seed=17");
  await page.getByRole("button", { name: "Enfrentar a Mirra" }).click();
  await page.waitForFunction(() => window.__game?.pantalla === "playing");
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.colocar({ sael: [-1.5, 2.8], odo: [1.5, 2.8], jefe: [-4, 0] });
    g.setVidaJefe(0);
    g.step(420);
  });

  await page.keyboard.press("p");
  const carta = page.getByRole("dialog", {
    name: "Carro de completos de Bodoque",
  });
  const comprar = carta.getByRole("button", {
    name: "Comprar · Completo italiano · 25 pesos",
  });
  await comprar.click();
  await page.evaluate(() => window.__game.step(240));
  expect(await page.evaluate(() => window.__game.etapa)).toBe("victoria");
  await expect(carta).toBeVisible();

  // El fallo sucede en la nueva sala. Al recuperar la red no hay que volver a comprar.
  const modelo = "**/sael.glb";
  await page.route(modelo, (ruta) => ruta.abort());
  await carta.getByRole("button", { name: "Volver al juego" }).click();
  await page.evaluate(() => window.__game.step(180));
  await expect(page.locator("#intro")).toContainText(
    "No se pudo cargar la sala del Farolero",
  );
  await page.unroute(modelo);
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.waitForFunction(
    () =>
      window.__game.pantalla === "cinematica" && window.__game.combate === null,
  );
  expect(await page.evaluate(() => window.__game.tienda.saldo)).toBe(0);
  await page.evaluate(() => window.__game.step(540));
  await expect(
    page.getByRole("heading", { name: "Continuará..." }),
  ).toBeVisible();
});
