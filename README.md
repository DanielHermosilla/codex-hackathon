# Hackatón Codex

**AtaDos** es un boss rush cooperativo de Geek Labs para navegador de escritorio. Sael y Odo están unidos por una cadena: hace daño al cruzar al enemigo y corta más al tensarla. La partida empieza al pie del Templo Celestial. Puedes practicar con el muñeco de paja o subir por el pasillo. Las tarjetas enseñan los controles por el camino. Cruza el arco de la cima para enfrentar a Mirra la Hambrienta. Sus seis ataques se combinan con la luz divina, el pisotón, los braseros y los turnos alternos de ácido y vacío.

## Jugar

Instala Git, Python 3.11 o posterior y Node.js 24 con npm. Si usas nvm, ejecuta `nvm install` y `nvm use` desde la raíz.

```sh
npm ci
npm run dev
```

Abre la dirección que imprima Vite, normalmente `http://localhost:5173`. Deja la terminal abierta mientras juegas. Pulsa Ctrl+C para cerrar el servidor. Usa un navegador de escritorio con WebGL 2 y teclado.

En el menú, los ajustes y la carta puedes moverte con **WASD** o las **flechas**. Confirma con **Enter**, **Shift** o **Espacio**. Durante la pelea o en derrota, mantén **R** un segundo para reintentar. La pantalla de derrota también permite volver al inicio.

Elige **Solo** para mover a Sael con WASD y a Odo con las flechas. Espacio hace esquivar a ambos. Enreda la cadena en un pilar para fijar un extremo y barrer desde ahí. En **Dos jugadores**, Sael esquiva con Espacio y Odo con Shift derecho. Mantén Shift izquierdo o Enter para anclar a Sael u Odo. La partida se pausa con Esc o al cambiar de ventana. En **Ajustes → Cómo jugar** puedes consultar los controles de mando.

Durante la práctica, busca el carro de completos a la derecha de la escalinata. Acércate y pulsa **P** para ver la carta. Empiezas con cero monedas y recibes 25 al vencer a Mirra. Tras el combate sal por el arco norte y encontrarás el carro a la derecha del pasillo. **Ir al carro de completos** acorta ese tramo. El completo italiano y el mote con huesillos cuestan 25 monedas cada uno. La sopaipilla cuesta 23. **Esc** cierra la carta. Desde el carro puedes entrar a la sala del Farolero o continuar a pie hasta el dominio de Ondar, donde termina el recorrido.

El engranaje de la portada y de la pausa permite ajustar el volumen general y las teclas de ambos personajes. La [dirección de diseño](docs/atados/), los [créditos de recursos](CREDITS.md) y la [arquitectura](docs/architecture.md) acompañan al juego.

## El ácido de Mirra

Para practicar este ataque abre `/?jefe=mirra&seed=17`. Mirra marca a Sael o a Odo y enciende la mecha de un barril. Lleva al personaje marcado junto al barril y espera hasta que Mirra escupa. En cuanto salga el proyectil, aparta a la pareja. Si el ácido cae sobre el barril, apaga la mecha y conserva las coberturas. El charco que deja en el suelo daña mientras se evapora.

## El Farolero

Después de vencer a Mirra, pasa por el carro de completos y elige **Enfrentar al Farolero**. Tus compras se conservan durante el combate final. También puedes abrir `/?jefe=farolero&seed=17` desde la dirección del juego para practicar ese combate.

El Farolero propone tres pruebas en el mismo orden. Primero, deja el prisma entre Sael y Odo y pasa la cadena por el cristal. Luego, sal de las huellas que deja el jefe bajo tus pies antes de que exploten. Por último, pisa las campanas **1, 2 y 3** con cualquiera de los dos. Cada acierto le quita vida al Farolero. La primera vuelta sirve para ensayar y puedes fallar sin recibir daño. Si tu compañero cae, toca el prisma directamente con el superviviente.

## Comprobar un cambio

Instala Chromium para Playwright una vez por cada versión de Playwright. Luego ejecuta la validación completa.

```sh
npx playwright install chromium
python3 scripts/validate.py --strict
```

Si dos sesiones prueban el juego a la vez, asigna un puerto libre a la segunda. En macOS puedes usar `ATADOS_TEST_PORT=4293 python3 scripts/validate.py --strict`.

PowerShell, macOS y Linux pueden ejecutar los comandos de npm. Para el flujo de Codex en Windows, consulta los pasos de WSL en la guía de configuración.

`npm run build` deja la versión web en `dist/`. `npm run preview` permite abrir esa compilación localmente. El test de navegador guarda una captura del canvas en `test-results/`.

## Trabajar con Codex

Lee [Configurar Codex](docs/codex-setup.md) para activar los hooks del repositorio y comprobar las skills. [Arquitectura](docs/architecture.md) muestra dónde cambiar la pista y las reglas. [Colaboración](docs/collaboration.md) describe las ramas, el PR y las aprobaciones.

El [diseño de AtaDos](docs/atados/) reúne las mecánicas, las fichas de jefes y las decisiones del prototipo.
