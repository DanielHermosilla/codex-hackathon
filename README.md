# Hackatón Codex

**AtaDos** es un boss rush cooperativo de Geek Labs para navegador de escritorio. Sael y Odo están unidos por una cadena, y la cadena es su única arma: corta cuando está tensa y la pasan a través del enemigo. La partida empieza al pie del Templo Ancla. Puedes practicar con el muñeco de paja o subir directamente por el pasillo. Las tarjetas enseñan los controles por el camino. Cruza el arco de la cima para enfrentar a Mirra la Hambrienta, que combina seis ataques en dos fases con el vacío, la luz divina, el pisotón y los braseros.

## Jugar

Instala Git, Python 3.11 o posterior y Node.js 24 con npm. Si usas nvm, ejecuta `nvm install` y `nvm use` desde la raíz.

```sh
npm ci
npm run dev
```

Abre la dirección que imprima Vite, normalmente `http://localhost:5173`. Deja la terminal abierta mientras juegas. Pulsa Ctrl+C para cerrar el servidor. Usa un navegador de escritorio con WebGL 2 y teclado.

Elige **Solo** para mover a Sael con WASD y a Odo con las flechas. Espacio hace esquivar a ambos. Enreda la cadena en un pilar para fijar un extremo y barrer desde ahí. En **Dos jugadores**, Sael esquiva con Espacio y Odo con Shift derecho. Mantén Shift izquierdo o Enter para anclar a Sael u Odo. La partida se pausa con Esc o al cambiar de ventana. En **Ajustes → Cómo jugar** puedes consultar los controles de mando.

Durante la práctica, busca el carro de completos a la derecha de la escalinata. Acércate y pulsa **P** para ver la carta. Empiezas con cero monedas y recibes 25 al vencer a Mirra. Elige **Continuar al carro de completos** para visitar el furgón en el muelle. El completo italiano y el mote con huesillos cuestan 25 monedas cada uno. La sopaipilla cuesta 23. Cada producto mejora a ambos personajes. **Esc** cierra la carta.

El engranaje de la portada y de la pausa permite ajustar el volumen general y las teclas de ambos personajes. La [dirección de diseño](docs/atados/), los [créditos de recursos](CREDITS.md) y la [arquitectura](docs/architecture.md) acompañan al juego.

## Comprobar un cambio

Instala Chromium para Playwright una vez por cada versión de Playwright. Luego ejecuta la validación completa.

```sh
npx playwright install chromium
python3 scripts/validate.py --strict
```

PowerShell, macOS y Linux pueden ejecutar los comandos de npm. Para el flujo de Codex en Windows, consulta los pasos de WSL en la guía de configuración.

`npm run build` deja la versión web en `dist/`. `npm run preview` permite abrir esa compilación localmente. El test de navegador guarda una captura del canvas en `test-results/`.

## Trabajar con Codex

Lee [Configurar Codex](docs/codex-setup.md) para activar los hooks del repositorio y comprobar las skills. [Arquitectura](docs/architecture.md) muestra dónde cambiar la pista y las reglas. [Colaboración](docs/collaboration.md) describe las ramas, el PR y las aprobaciones.

El [diseño de AtaDos](docs/atados/) reúne las mecánicas, las fichas de jefes y las decisiones del prototipo.
