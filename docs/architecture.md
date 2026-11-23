# Arquitectura del juego

La demo corre en un navegador de escritorio con teclado y WebGL 2. Usa JavaScript con módulos, Three.js 0.187.0 para dibujar y Vite para servir y compilar. Node.js 24 coincide con el CI. `package-lock.json` fija todo el árbol de dependencias.

| Si quieres cambiar… | Abre |
| --- | --- |
| La velocidad o los límites de movimiento | [src/movement.js](../src/movement.js) |
| El cubo, la pista, la cámara o las luces | [src/scene.js](../src/scene.js) |
| Las teclas, el reinicio o el ciclo de cuadros | [src/main.js](../src/main.js) |
| La disposición y colores de la página | [index.html](../index.html) y [src/style.css](../src/style.css) |

En la pista original, `pista.html` carga `src/main.js`. Cada cuadro, el módulo de entrada lee las teclas, pasa el tiempo a la lógica de movimiento y entrega la posición a Three.js. Las pruebas unitarias ejecutan esa lógica en Node, con direcciones y tiempos explícitos. La prueba de Chromium abre la compilación y verifica en el canvas que el cubo se mueve y vuelve al centro.

Playwright solo se usa para la prueba en navegador. Prettier comprueba el formato, ESLint busca errores de JavaScript, y TypeScript comprueba los tipos de los archivos JavaScript a partir de JSDoc. Los archivos del juego siguen siendo JavaScript.

- Separa las reglas y el estado del juego de la presentación, el audio y la entrada cuando lo permita el motor. Cubre las transiciones importantes con pruebas pequeñas.
- Haz reproducibles los casos que dependen de reloj, eventos, física o azar. Pasa un tiempo de simulación o semilla controlable cuando facilite la prueba.
- Reutiliza sistemas y recursos existentes. Mide antes de optimizar. Para cambios en bucles por cuadro, revisa asignaciones y costo por entidad.
- Documenta motor, versión, plataforma de la demo, punto de arranque y versión de dependencias al elegirlos. Acuerda quién edita cada escena o recurso difícil de combinar. Revisa si hace falta Git LFS antes de versionar binarios grandes.
- Las pruebas más rápidas cubren reglas puras. Un caso de integración debe cargar una escena o recorrer un camino real. Antes de publicar una versión jugable, prueba entrada, arranque y salida en la plataforma objetivo.

## Prototipo de AtaDos

La portada carga `src/atados/main.js`. La pista anterior usa `pista.html` y `src/main.js`. Vite compila ambas páginas.

`main.js` une la página (menú, modos Solo y Dos jugadores, pausa, resultados y cartel del puesto) con el combate. Cada sala (la práctica con el muñeco de paja y la pelea con Mirra) crea su combate, su render y su HUD; el audio y la entrada duran toda la sesión.

| Carpeta | Qué hay |
|---|---|
| `src/atados/core/` | `config.js` (todos los números, la paleta y los tiempos), RNG con semilla (`?seed=N`), entrada de teclado y mandos, bucle de paso fijo (60 pasos por segundo, `dt` con tope) |
| `src/atados/gameplay/` | Reglas puras sin three.js ni DOM: cadena de eslabones con enredo en pilares y daño por tensión, jugadores (dash, ancla, cadáver), jefe genérico con fases y bloques de ataque reutilizables |
| `src/atados/render/` | Escena del trigal, cámara 3/4, personajes y Mirra con modelos GLB, cadena de metal, telegrafías planas, partículas con pools, muñeco de práctica y carro de completos |
| `src/atados/audio/` | Música por capas que sigue la pelea, avisos sonoros por ataque, zumbido de la cadena según la tensión (zzfx) |
| `src/atados/ui/` | HUD del combate: barra del jefe, números de daño, lápida de victoria |
| `src/atados/i18n/` | Textos en español e inglés (`?lang=en`) |

Durante la práctica, Sael u Odo pueden acercarse al carro del borde derecho. Aparece un aviso sobre el furgón y P abre la tienda a pantalla completa. La simulación queda en pausa hasta cerrar la carta. Las compras de la pareja viven en `gameplay/tienda.js` y la interfaz en `ui/tienda.js`. Las mejoras se conservan al pasar a Mirra y al reintentar. La pareja empieza con cero monedas. El evento de victoria abona la recompensa definida en la ficha del jefe (cero para el muñeco). Los precios están en `CONFIG.tienda.precios`. Volver al inicio abre una partida nueva y reinicia el saldo.

Un jefe nuevo es un bloque de datos en `CONFIG.jefes`: vida, arena, fases y ataques hechos con los bloques de `gameplay/bloques.js` (barrido, zona, proyectiles en arco, carga, zona móvil, tirón). Todo ataque se puede cancelar y libera lo que creó. La práctica es un jefe más (`muneco`) sin ataques.

`window.__game` expone el estado de solo lectura y utilidades deterministas para las pruebas: `step(n)` avanza `n` pasos fijos, `setInput` simula controles, `forzarAtaque` y `setVidaJefe` llevan la pelea a un momento concreto. Las pruebas de lógica están en `tests/unit/atados/` y las de navegador en `tests/browser/atados.spec.js`.

Los modelos se generan con los scripts de `assets-src/atados/blender/` (ver su README) y se sirven desde `public/atados/models/`.

## Validación

El validador usa Python estándar. Las etapas llaman a los comandos de npm definidos en [checks.toml](../checks.toml). Seis etapas son obligatorias para integrar.

| Etapa | Qué comprueba |
| --- | --- |
| `format` | Formato en modo de comprobación |
| `lint` | Reglas del lenguaje, proyecto y motor |
| `static` | Tipos u otro análisis estático que corresponda |
| `test` | Pruebas unitarias con al menos un caso real |
| `build` | Construcción o exportación con verificación de salida |
| `integration` | Ejecución sin interfaz si el motor lo permite, con un escenario representativo |

Cada valor de `[checks]` es un arreglo de comandos. Cada comando es un arreglo de argumentos. Por ejemplo, si el equipo crea un adaptador ejecutable `tools/comprobar-formato`, la entrada es `format = [["./tools/comprobar-formato"]]`. Se ejecuta desde la raíz, sin interpretación por shell. Pon operaciones de composición en adaptadores versionados. Proporciona herramientas fijadas en el CI y documenta cómo instalarlas localmente. Si el motor necesita otra plataforma, cambia el runner de `Juego` y conserva los nombres de los checks requeridos.

Las comprobaciones deben ser no interactivas. Usa el modo de solo comprobación para formato y lint, exige que el runner de pruebas falle cuando recolecte cero casos y coloca las salidas generadas en rutas ignoradas. Para tareas que necesitan una carpeta temporal bajo el sandbox usa una ruta ignorada dentro del checkout y configura la herramienta si corresponde. Haz que un fallo real se refleje en el código de salida. Mantén las comprobaciones obligatorias del PR libres de credenciales y revisa las dependencias antes de ejecutarlas.

| Comando | Resultado |
| --- | --- |
| `python3 scripts/validate.py --harness` | Suite del entorno y validez de `checks.toml` |
| `python3 scripts/validate.py` | Entorno y etapas configuradas. Informa etapas ausentes. |
| `python3 scripts/validate.py --stage test` | Solo una etapa. Admite los seis nombres de la tabla. |
| `python3 scripts/validate.py --strict` | Exige éxito del entorno y de las seis etapas. |

Salida `0` indica éxito dentro del modo elegido, `1` algún fallo y `2` etapa ausente en modo individual o estricto. Un fallo tiene prioridad si también faltan etapas. `Juego` usa el modo estricto. Si la ejecución normal sale con `0` y muestra `SIN CONFIGURAR`, el cambio sigue pendiente de validación completa.

Si ejecutas `--stage integration` por separado, ejecuta primero `npm run build`. El modo estricto ya construye la versión que abre Playwright.
