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

test("la pareja visita el carro en la práctica y compra después de vencer a Mirra", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const errores = [];
  page.on("pageerror", (error) => errores.push(error.message));
  page.on("console", (mensaje) => {
    if (mensaje.type() === "error") errores.push(mensaje.text());
  });
  await page.goto("/?seed=3");
  const jugar = page.getByRole("button", { name: "Jugar" });
  const aviso = page.locator("#aviso-puesto");
  const carta = page.getByRole("dialog", { name: "Carro de completos" });
  await expect(jugar).toBeVisible();
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();
  await jugar.click();
  await page.waitForFunction(() => window.__game?.pantalla === "playing");
  await page.keyboard.press("p");
  await expect(aviso).toBeHidden();
  await expect(carta).toBeHidden();

  // En la práctica se llega a pie desde el punto de caída. La pareja todavía no tiene monedas.
  await page.evaluate(() => window.__game.step(100));
  await caminarHasta(page, { x: 8.5, z: -6 });
  await expect(aviso).toBeVisible();
  const mural = page.locator("#mural");
  await expect(mural).toHaveAttribute("aria-label", "Carro de completos");
  const tarjeta = page.locator(".hud .tarjeta");
  await expect(tarjeta).toBeVisible();
  const dialogo = await mural.boundingBox();
  expect(dialogo.y + dialogo.height).toBeLessThan(
    (await tarjeta.boundingBox()).y,
  );
  await page.screenshot({ path: info.outputPath("carro-practica.png") });
  await page.keyboard.press("p");
  await expect(carta).toBeVisible();
  await expect(carta.locator(".carta-saldo")).toHaveText("0 monedas");
  await expect(carta.getByRole("button", { name: /Comprar/ })).toHaveCount(3);
  for (const boton of await carta
    .getByRole("button", { name: /Comprar/ })
    .all())
    await expect(boton).toBeDisabled();
  const tiempoPractica = await page.evaluate(() => window.__game.state.time);
  await page.evaluate(() => window.__game.step(60));
  expect(await page.evaluate(() => window.__game.state.time)).toBe(
    tiempoPractica,
  );
  await page.keyboard.press("Escape");
  await expect(carta).toBeHidden();
  await expect(page.locator("#arena")).toBeFocused();
  await caminarHasta(page, { x: 0, z: 3 });
  await expect(aviso).toBeHidden();

  // Solo se acorta el combate: la recompensa y el paso a la tienda usan los botones y eventos de partida.
  await page.evaluate(async () => {
    const g = window.__game;
    await g.saltarAlJefe();
    g.saltarPresentacion();
    g.setVidaJefe(0);
    g.step(420);
  });
  await expect(page.locator("#intro")).toContainText("Recompensa: +1 moneda");
  await page.locator("#continuar-puesto").click();
  await page.waitForFunction(
    () =>
      window.__game.etapa === "puesto" && window.__game.pantalla === "playing",
  );
  await page.evaluate(() => window.__game.step(1));
  await expect(aviso).toBeHidden();
  const inicio = await page.evaluate(() => {
    const [a, b] = window.__game.state.players;
    return { x: (a.x + b.x) / 2, z: (a.z + b.z) / 2 };
  });
  await caminarHasta(page, { x: 2, z: -25 });
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("P");
  await expect(mural).toHaveAttribute(
    "aria-label",
    "Carro de completos · El Trigal",
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
  await expect(saldo).toHaveText("1 moneda");
  await page.screenshot({ path: info.outputPath("carta.png") });
  const antes = await page.evaluate(() => window.__game.state.time);
  await page.evaluate(() => window.__game.step(120));
  expect(await page.evaluate(() => window.__game.state.time)).toBe(antes);
  await carta
    .getByRole("button", { name: "Comprar · Completo italiano · 1 moneda" })
    .click();
  await expect(saldo).toHaveText("0 monedas");
  await expect(
    carta.getByRole("button", { name: "Comprado · Completo italiano" }),
  ).toBeDisabled();
  await expect(carta.locator(".carta-detalle button:disabled")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(carta).toBeHidden();
  await expect(page.locator("#arena")).toBeFocused();
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1250, 1250]);
  await page.keyboard.press("p");
  await expect(saldo).toHaveText("0 monedas");
  await carta.getByRole("button", { name: "Volver al juego" }).click();
  await caminarHasta(page, inicio);
  await expect(aviso).toBeHidden();
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();

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
  // Tras la derrota final solo se puede volver a la portada, igual que al caer ante Mirra.
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
