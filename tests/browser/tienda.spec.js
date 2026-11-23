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

test("la moneda de Mirra permite comprar en el carro del siguiente pasillo", async ({
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
  const mural = page.locator("#mural");
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
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await page.waitForFunction(() => window.__game.pantalla === "menu");
  await jugar.click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([1000, 1000]);
  expect(errores).toEqual([]);
});
