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
  await page.screenshot({ path: info.outputPath("aviso.png") });
  await page.keyboard.press("p");
  await expect(carta).toBeVisible();
  expect(await carta.boundingBox()).toEqual({
    x: 0,
    y: 0,
    ...page.viewportSize(),
  });
  await expect(carta.getByRole("listitem")).toHaveCount(3);
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
  const ventana = page.viewportSize();
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
  await page.keyboard.press("p");
  await expect(saldo).toHaveText("0 pesos");
  await carta.getByRole("button", { name: "Volver al juego" }).click();
  await caminarHasta(page, { x: 0, z: 8 });
  await expect(aviso).toBeHidden();
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();

  // Rodean el carro por el espacio entre su costado izquierdo y los pilares de Mirra.
  await caminarHasta(page, { x: -5.3, z: 7 });
  await caminarHasta(page, { x: -5.3, z: -5 });
  await caminarHasta(page, { x: 0, z: -6 });
  await page.keyboard.down("KeyW"); // Sael y Odo avanzan con sus teclas reales
  await page.keyboard.down("ArrowUp");
  await page.evaluate(() => {
    window.__game.step(400);
    // Aunque el montaje termine después, salir de la ventana deja el juego en pausa.
    window.dispatchEvent(new window.Event("blur"));
  });
  await page.keyboard.up("KeyW");
  await page.keyboard.up("ArrowUp");
  await page.waitForFunction(
    () =>
      window.__game.etapa === "puesto" && window.__game.pantalla === "paused",
  );
  await page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.evaluate(() => window.__game.step(1));
  await expect(aviso).toBeHidden();
  const inicio = await page.evaluate(() => {
    const [a, b] = window.__game.state.players;
    return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  });
  // El segundo emplazamiento antiguo también está vacío.
  await caminarHasta(page, { x: 2, z: -25 });
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();
  await expect(aviso).toBeHidden();
  expect(await page.evaluate(() => window.__game.tienda)).toEqual({
    carro: null,
    saldo: 0,
  });

  // La llegada al dominio de Ondar se activa al caminar hasta el final del muelle.
  await caminarHasta(page, { x: -1, z: -32.5 });
  await expect(
    page.getByRole("heading", { name: "Ondar el Ahogado" }),
  ).toBeVisible();
  await expect(page.locator("#intro")).toContainText("Aquí termina");
  const volverAlMuelle = page.getByRole("button", {
    name: "Volver al muelle",
  });
  // Si el modelo no carga al repetir Mirra, se conserva el destino y se puede volver al muelle.
  await page.route("**/mirra.glb", (route) =>
    route.fulfill({
      contentType: "model/gltf-binary",
      body: "modelo incompleto",
    }),
  );
  await page.getByRole("button", { name: "Reintentar a Mirra" }).click();
  await expect(page.locator("#intro")).toContainText(
    "No se pudo cargar la pradera",
  );
  expect(await page.evaluate(() => window.__game.etapa)).toBe("destino");
  await page.unroute("**/mirra.glb");
  await expect(volverAlMuelle).toBeFocused();
  await page.keyboard.press("d");
  await expect(page.locator("#primary")).toBeFocused();
  await page.keyboard.press("a");
  await page.keyboard.press("Space");
  // F puede reasignarse al movimiento: el botón del puesto sigue disponible para entrar al jefe.
  const enfrentar = page.getByRole("button", { name: "Enfrentar al Farolero" });
  await expect(enfrentar).toHaveAttribute("aria-keyshortcuts", "F");
  await page.locator("#pause").click();
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  const derecha = page.getByRole("button", { name: /Sael · Derecha/ });
  await derecha.click();
  await page.keyboard.press("KeyF");
  await expect(derecha).toHaveText("F");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Continuar" }).click();
  await caminarHasta(page, inicio);
  await page.keyboard.down("KeyF");
  await page.evaluate(() => window.__game.step(3));
  await page.keyboard.up("KeyF");
  expect(await page.evaluate(() => window.__game.etapa)).toBe("puesto");
  await expect(enfrentar).not.toHaveAttribute("aria-keyshortcuts", "F");
  await enfrentar.click();
  await page.waitForFunction(
    () =>
      window.__game.combate?.jefe.id === "farolero" &&
      window.__game.pantalla === "playing",
  );
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1250, 1250]);
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.setVidaJefe(0);
    g.step(420);
  });
  // La victoria final deja elegir cuándo terminar. La pareja conserva el italiano y puede guardar el premio.
  expect(await page.evaluate(() => window.__game.render.carroVictoria)).toEqual(
    { x: 0, z: 0 },
  );
  expect(
    await page.evaluate(() => window.__game.render.monedasVisibles),
  ).toBeGreaterThan(0);
  await caminarHasta(page, { x: 0, z: 2.8 });
  await page.keyboard.press("p");
  await expect(saldo).toHaveText("25 pesos");
  await expect(
    carta.getByRole("button", { name: "Comprado · Completo italiano" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.evaluate(() => window.__game.step(600));
  expect(await page.evaluate(() => window.__game.tienda.saldo)).toBe(25);
  await page.getByRole("button", { name: "Terminar partida" }).click();
  await expect(
    page.getByRole("heading", { name: "El Farolero ha caído" }),
  ).toBeVisible();
  await expect(page.locator("#continuar-puesto")).toBeHidden();
  await page.locator("#primary").click();
  await page.waitForFunction(
    () =>
      window.__game.combate?.jefe.id === "farolero" &&
      window.__game.pantalla === "playing",
  );
  // El reintento usa la misma compra; al volver al menú, la siguiente partida empieza de cero.
  await page.keyboard.press("Escape");
  await page.locator("#restart").click();
  await page.waitForFunction(
    () =>
      window.__game.etapa === "jefe" && window.__game.pantalla === "playing",
  );
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1250, 1250]);
  // Tras la derrota final, el botón vuelve a la portada y limpia las compras.
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.matarJugadores();
    g.step(2);
  });
  await expect(
    page.getByRole("heading", { name: "Caísteis los dos" }),
  ).toBeFocused();
  await expect(page.getByRole("button")).toHaveText(["Volver al inicio"]);
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await page.waitForFunction(() => window.__game.pantalla === "menu");
  await jugar.click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1000, 1000]);
  expect(errores).toEqual([]);
});

test("se puede seguir sin comprar y reintentar la carga del muelle", async ({
  page,
}) => {
  await page.goto("/?jefe=mirra&seed=17");
  await page.getByRole("button", { name: "Enfrentar a Mirra" }).click();
  await page.waitForFunction(() => window.__game?.pantalla === "playing");
  await page.evaluate(() => {
    const g = window.__game;
    g.saltarPresentacion();
    g.setVidaJefe(0);
    g.step(420);
  });

  // Fuerza un fallo en el modelo de la nueva escena, después de cargar la pradera.
  const modelo = "**/sael.glb";
  await page.route(modelo, (ruta) => ruta.abort());
  await page.getByRole("button", { name: "Continuar al muelle" }).click();
  const continuar = page.getByRole("button", {
    name: "Continuar",
    exact: true,
  });
  await expect(page.locator("#intro")).toContainText(
    "No se pudo cargar el muelle",
  );
  await page.unroute(modelo);
  await continuar.evaluate((boton) => {
    boton.click();
    // El siguiente cuadro aún no montó el puesto. F no puede abrir otra arena.
    window.dispatchEvent(new window.KeyboardEvent("keydown", { code: "KeyF" }));
    window.__game.step(1); // el paso reanuda el montaje del puesto con la red restaurada
  });
  await page.waitForFunction(
    () =>
      window.__game.escena === "puesto" && window.__game.pantalla === "playing",
  );
  expect(await page.evaluate(() => window.__game.tienda)).toEqual({
    saldo: 25,
    carro: null,
  });
  await expect(
    page.getByRole("button", { name: "Enfrentar al Farolero" }),
  ).toBeVisible();
});
