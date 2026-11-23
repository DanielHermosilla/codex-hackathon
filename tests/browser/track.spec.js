import { expect, test } from "@playwright/test";

test("la pista dibuja, responde al teclado y vuelve al centro", async ({
  page,
}, testInfo) => {
  // Registramos errores de JavaScript desde el inicio, incluso durante la carga.
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/pista.html");
  const track = page.locator("#pista");
  await expect(track).toBeVisible();
  // El anillo de foco cambia al hacer clic. Comparamos solo los píxeles de la pista.
  const style = "#pista { outline: none !important; }";

  // Entrar con Tab comprueba el acceso al canvas sin usar el mouse.
  await page.keyboard.press("Tab");
  await expect(track).toBeFocused();
  const initial = await track.screenshot({
    path: testInfo.outputPath("pista.png"),
    style,
  });

  // Mantenemos D hasta que los píxeles de la escena cambien.
  await page.keyboard.down("d");
  try {
    await expect
      .poll(async () => (await track.screenshot({ style })).equals(initial))
      .toBe(false);
  } finally {
    // Soltamos la tecla incluso ante un fallo de la comprobación.
    await page.keyboard.up("d");
  }

  await page.getByRole("button", { name: "Volver al centro" }).click();
  // El cuadro vuelve al estado inicial y el teclado queda listo para otro movimiento.
  await expect
    .poll(async () => (await track.screenshot({ style })).equals(initial))
    .toBe(true);
  await expect(track).toBeFocused();
  expect(errors).toEqual([]);
});

test("muestra un mensaje si WebGL 2 no está disponible", async ({ page }) => {
  // Simulamos un navegador sin WebGL 2 antes de que empiece a cargar el juego.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, options) {
      return type === "webgl2" ? null : getContext.call(this, type, options);
    };
  });

  await page.goto("/pista.html");
  await expect(page.getByRole("alert")).toContainText("WebGL 2");
  await expect(page.locator("#pista")).toBeHidden();
  await expect(
    page.getByRole("button", { name: "Volver al centro" }),
  ).toBeHidden();
});
