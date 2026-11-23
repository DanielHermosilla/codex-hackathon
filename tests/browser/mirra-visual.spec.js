// Desde la raíz: npm run build && npm run test:browser -- tests/browser/mirra-visual.spec.js
// En test-results/ quedan dos PNG por ataque, identificados como aviso y golpe.
import { expect, test } from "@playwright/test";

// Los pasos se cuentan desde el inicio del golpe (60 pasos = 1 s).
// Tres pasos permiten ver incluso la mordida de Banquete, que dura apenas 0,1 s.
const ataques = [
  { id: "siega", fase: 1, pasosGolpe: 6 },
  { id: "grano", fase: 1, pasosGolpe: 8 },
  { id: "hambre", fase: 1, pasosGolpe: 28 },
  { id: "siega_doble", fase: 2, pasosGolpe: 55 }, // segundo barrido, después de la pausa entre golpes
  { id: "enjambre", fase: 2, pasosGolpe: 32 },
  { id: "banquete", fase: 2, pasosGolpe: 3 },
];

test("Mirra muestra los seis ataques en sus dos etapas", async ({
  page,
}, info) => {
  test.setTimeout(120000); // una sola carga WebGL para todos los ataques, también en CI
  await page.goto("/?seed=3&coop"); // dos jugadores quietos y un patrón de grano repetible
  await page.waitForFunction(() => window.__game?.pantalla === "menu");
  await page.evaluate(() => window.__game.step(0)); // congela el fondo del menú antes del clic
  await page.getByRole("button", { name: "Jugar" }).click();
  await page.evaluate(async () => {
    const juego = window.__game;
    juego.step(1); // detiene el reloj real antes de esperar la carga de la arena
    await juego.saltarAlJefe();
  });

  for (const { id, fase, pasosGolpe } of ataques) {
    await test.step(id, async () => {
      const hastaGolpe = await page.evaluate(
        ({ id, fase }) => {
          const juego = window.__game;
          juego.reiniciar(); // restablece vida, zonas, jugadores y cadena, conservando la escena cargada
          juego.saltarPresentacion();
          juego.sinAtaques(); // el planificador y los ritos dejan libre la arena para el ataque elegido
          if (fase === 2) juego.setVidaJefe(juego.combate.jefe.vidaMax * 0.4);
          juego.step(200); // deja terminar la transición y el destello de la fase 2
          juego.colocar({ jefe: [0, -3], sael: [-2, 3], odo: [2, 3] });
          juego.forzarAtaque(id);
          const total = Math.ceil(juego.combate.jefe.accion.T * 60 - 1e-8);
          const aviso = Math.floor(total * 0.8); // el ataque está anunciado y el grano ya está en vuelo
          juego.step(aviso);
          return total - aviso;
        },
        { id, fase },
      );

      // Comprueba tanto la acción del jefe como la zona que verá el jugador al esquivar.
      async function capturar(archivo, etapaAccion, etapaZona) {
        const combate = await page.evaluate(() => window.__game.combate);
        expect(combate.jefe).toMatchObject({
          fase,
          accion: { id, etapa: etapaAccion },
        });
        expect(combate.zonas).toContainEqual(
          expect.objectContaining({ ataque: id, etapa: etapaZona }),
        );
        await page.screenshot({ path: info.outputPath(`${id}-${archivo}`) });
      }

      await capturar("aviso.png", "telegrafia", "aviso");
      await page.evaluate(
        ({ hastaGolpe, pasosGolpe }) => {
          window.__game.step(hastaGolpe); // monta la señal en el primer cuadro activo
          window.__game.step(pasosGolpe); // deja crecer las púas, girar la hoja o cerrar los dientes
        },
        { hastaGolpe, pasosGolpe },
      );
      await capturar("golpe.png", "activo", "activa");
    });
  }
});
