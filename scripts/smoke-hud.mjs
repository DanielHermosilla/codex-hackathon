// Smoke de la interfaz, portado del smoke del HUD de AtaDos. Lo llama smoke.mjs con la página abierta.
// Comprueba DOM y tipografías, guarda una captura y no depende de un estado interno del juego.
// Cuando el juego tenga HUD, añade aquí sus comprobaciones con `check(nombre, ok, detalle)`.
export async function hud({ page, OUT, check }) {
  // Las tipografías pueden cargarse tarde: que estén listas antes de capturar.
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${OUT}/02-interfaz.png` });

  const sinDebug = await page.evaluate(() => !document.getElementById("hud-debug"));
  check("sin HUD de depuración por defecto", sinDebug);

  const visible = await page.evaluate(() => {
    const canvas = document.querySelector("#pista");
    if (!canvas) return false;
    const box = canvas.getBoundingClientRect();
    return box.width > 0 && box.height > 0 && getComputedStyle(canvas).display !== "none";
  });
  check("la pista ocupa espacio en pantalla", visible);
}
