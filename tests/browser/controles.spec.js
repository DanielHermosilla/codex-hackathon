import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  test.setTimeout(120000); // Chromium sin GPU puede tardar en montar el primer escenario
  await page.goto("/?seed=3", { waitUntil: "domcontentloaded" });
  await expect(page.locator("#play")).toBeFocused({ timeout: 60000 });
  await page.evaluate(() => window.__game.step(0)); // los controles se prueban con el reloj detenido
});

test("el teclado recorre los ajustes, el diálogo y la pausa", async ({
  page,
}) => {
  const jugar = page.locator("#play");
  await expect(jugar).toBeFocused();
  await page.keyboard.press("w"); // desde Jugar se sube a los modos
  await expect(page.locator("#modes button:focus")).toHaveCount(1);
  await page.keyboard.press("ArrowDown");
  await expect(jugar).toBeFocused();
  await page.keyboard.press("d"); // desde Jugar se vuelve al engranaje
  const guia = page.locator("#settings");
  await expect(guia).toBeFocused();
  await page.keyboard.press("d");
  const solo = page.locator("#mode-solo");
  await expect(solo).toBeFocused();
  await page.keyboard.press("d");
  const coop = page.locator("#mode-coop");
  await expect(coop).toBeFocused();
  await page.keyboard.press("ShiftRight");
  await expect(coop).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("a");
  await expect(guia).toBeFocused();
  await page.keyboard.press("Enter");
  const ayuda = page.locator("#controls");
  await expect(ayuda).toBeVisible();
  await expect(page.locator("#close-settings")).toBeFocused();
  await page.keyboard.press("s");
  const volumen = ayuda.getByRole("slider", { name: "Volumen general" });
  await expect(volumen).toBeFocused();
  const antes = Number(await volumen.inputValue());
  await page.keyboard.press("a");
  await expect(volumen).toHaveValue(String(antes - 1));
  await page.keyboard.press("ArrowRight");
  await expect(volumen).toHaveValue(String(antes));
  await page.keyboard.press("w");
  await page.keyboard.press("ShiftLeft");
  await expect(ayuda).toBeHidden();
  await expect(guia).toBeFocused();
  for (let paso = 0; paso < 3; paso++) await page.keyboard.press("d");
  await expect(jugar).toBeFocused();
  await page.keyboard.press("Space");
  await expect(page.locator("#arena")).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.locator("#primary")).toBeFocused();
  await page.keyboard.press("d");
  await expect(page.locator("#restart")).toBeFocused();
  await page.keyboard.press("a");
  await page.keyboard.down("Enter");
  await expect(page.locator("#arena")).toBeFocused();
  await page.keyboard.down("Enter"); // la repetición llega al canvas después de cerrar la pausa
  expect(
    await page.evaluate(() => {
      window.__game.saltarCaida();
      window.__game.step(2);
      return window.__game.state.players[1].anchored;
    }),
  ).toBe(false);
  await page.keyboard.up("Enter");
});

test("R exige un segundo continuo de pelea y se cancela al perder el foco", async ({
  page,
}) => {
  await expect(page.locator("#play")).toBeFocused();
  await page.keyboard.press("Enter");
  await page.evaluate(async () => {
    const g = window.__game;
    g.step(1); // la prueba controla el reloj a 60 pasos por segundo
    await g.saltarAlJefe();
    g.saltarPresentacion();
    g.sinAtaques();
    g.setVidaJefe(10);
  });
  const pasos = (n) => page.evaluate((k) => window.__game.step(k), n);
  const vida = () => page.evaluate(() => window.__game.combate.jefe.vida);
  await page.keyboard.down("r");
  await pasos(40);
  await expect(page.locator("#objective")).toContainText("Mantén R");
  await page.keyboard.up("r");
  await pasos(40);
  expect(await vida()).toBe(10);
  await page.keyboard.down("r");
  await pasos(40);
  await page.evaluate(() => window.dispatchEvent(new window.Event("blur")));
  await expect(page.locator("#primary")).toBeFocused();
  await page.keyboard.press("Enter");
  await pasos(70);
  expect(await vida()).toBe(10);
  await page.keyboard.up("r");
  await page.keyboard.down("r");
  await page.evaluate(() => window.__game.step(9, 0.1)); // a 10 FPS la física limita el salto, el gesto conserva su duración
  expect(await vida()).toBe(10);
  await page.evaluate(() => window.__game.step(1, 0.1));
  expect(await vida()).toBeGreaterThan(10);
  await page.keyboard.press("ShiftLeft"); // la nueva presentación es saltable con la misma confirmación
  await pasos(1);
  expect(await page.evaluate(() => window.__game.combate.estado)).toBe("pelea");
  await page.evaluate(() => window.__game.setVidaJefe(10));
  await pasos(65); // mantener R después del reintento no debe provocar otro
  expect(await vida()).toBe(10);
  await page.keyboard.up("r");
  await page.evaluate(() => {
    window.__game.matarJugadores(); // al caer también se puede mantener R
    window.__game.step(65);
  });
  expect(await page.evaluate(() => window.__game.combate.estado)).toBe(
    "derrota",
  );
  await expect(page.locator("#intro")).toContainText("Mantén R");
  await page.keyboard.down("r");
  await pasos(60);
  await page.keyboard.up("r");
  expect(await page.evaluate(() => window.__game.combate.estado)).toBe(
    "presentacion",
  );
});
