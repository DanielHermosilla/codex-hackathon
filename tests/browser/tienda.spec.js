import { expect, test } from "@playwright/test";

// Dos jugadores caminando por el borde sur pueden llegar al mesón sin atravesar el muñeco.
async function caminar(page, direccion, pasos) {
  await page.evaluate(
    ([mx, n]) => {
      window.__game.setInput(0, { mx });
      window.__game.setInput(1, { mx });
      window.__game.step(n);
      window.__game.clearInput();
    },
    [direccion, pasos],
  );
}

test("solo se compra junto al carro y la carta pausa la práctica", async ({
  page,
}, info) => {
  test.setTimeout(120000);
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
  await expect(carta).toBeHidden();
  await expect(aviso).toBeHidden();

  // Odo llega primero: cualquiera puede pedir para los dos.
  await caminar(page, 1, 100);
  await expect(aviso).toBeVisible();
  await expect(aviso).toContainText("P");
  await page.screenshot({ path: info.outputPath("aviso.png") });
  await page.keyboard.press("p");
  const tamano = page.viewportSize();
  await expect(carta).toBeVisible();
  expect(await carta.boundingBox()).toEqual({ x: 0, y: 0, ...tamano });
  await expect(carta.getByRole("listitem")).toHaveCount(3);
  // Las tres ilustraciones deben cargarse también en la compilación final de Vite.
  await expect
    .poll(() =>
      carta
        .locator("img")
        .evaluateAll((imgs) => imgs.filter((i) => i.naturalWidth > 0).length),
    )
    .toBe(3);
  await page.screenshot({ path: info.outputPath("carta.png") });
  const antes = await page.evaluate(() => window.__game.state.time);
  await caminar(page, -1, 180);
  expect(await page.evaluate(() => window.__game.state.time)).toBe(antes);
  const saldo = carta.locator(".carta-saldo");
  const italiano = carta.getByRole("button", {
    name: "Comprar · Completo italiano · 1 moneda",
  });
  await expect(saldo).toHaveText("0 monedas");
  await expect(carta.locator(".carta-detalle button:disabled")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await expect(carta).toBeHidden();
  await expect(page.locator("#arena")).toBeFocused();
  await page.keyboard.press("p");
  await expect(italiano).toBeDisabled();
  await carta.getByRole("button", { name: "Volver al juego" }).click();
  await caminar(page, -1, 85);
  await expect(aviso).toBeHidden();
  await page.keyboard.press("p");
  await expect(carta).toBeHidden();
  expect(await page.evaluate(() => window.__game.state.time)).toBeGreaterThan(
    antes,
  );
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([100, 100]);
  await page.evaluate(() => {
    window.__game.setVidaJefe(0);
    window.__game.step(120);
  });
  await page.getByRole("button", { name: "Enfrentar a Mirra" }).click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([100, 100]);

  // Solo la victoria contra un jefe real abona monedas a la partida.
  await page.evaluate(() => {
    window.__game.saltarPresentacion();
    window.__game.setVidaJefe(0);
    window.__game.step(420);
  });
  await expect(page.locator("#intro")).toContainText("Recompensa: +1 moneda");
  // La demo termina en Mirra. Montamos por la API de pruebas otra sala con carro,
  // como la que vendría después del jefe, conservando el estado normal de la partida.
  await page.evaluate(() => window.__game.empezar("muneco"));
  await caminar(page, 1, 100);
  await page.keyboard.press("p");
  await expect(saldo).toHaveText("1 moneda");
  await italiano.click();
  await expect(saldo).toHaveText("0 monedas");
  await expect(
    carta.getByRole("button", { name: "Comprado · Completo italiano" }),
  ).toBeDisabled();
  await expect(carta.locator(".carta-detalle button:disabled")).toHaveCount(3);
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => window.__game.state.players.map((p) => p.hp)),
  ).toEqual([125, 125]);
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Volver al inicio" }).click();
  await jugar.click();
  await page.waitForFunction(() => window.__game.pantalla === "playing");
  await caminar(page, 1, 100);
  await page.keyboard.press("p");
  await expect(saldo).toHaveText("0 monedas");
  await expect(carta.getByRole("button", { name: /^Comprar/ })).toHaveCount(3);
});
