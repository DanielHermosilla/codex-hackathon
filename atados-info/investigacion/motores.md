# Motores para la hackatón (19-11-2026)

## Conceptos
- **Motor**: software que resuelve lo repetitivo (dibujo, física, sonido, input, escenas); tú programas la lógica.
- **Framework/librería**: herramientas en código sin editor visual; escribes loop y estructura (Three.js, Phaser, Kaplay, LÖVE).
- **Motor con editor**: app visual para armar escenas (Godot, Unity, Unreal). Parte del trabajo queda en formatos que los agentes editan peor y que generan conflictos de merge.
- Regla para agentes: cuanto más esté en texto y más conocida la API por los modelos, mejor. Export web = demo instantánea para el jurado.

## Estado 2026 y encaje
| Opción | Estado | Para qué | Web | Encaje agentes / riesgo 10 h |
|---|---|---|---|---|
| Canvas/HTML puro | — | arcade 2D, todo procedural | nativo | máximo control, cero setup; construir todo a mano |
| **Phaser 4** | estable 10-abr-2026, v4.2.1 jul; trae skills para agentes (https://phaser.io/download/stable) | 2D completo (escenas, física arcade, tweens, partículas) | nativo | muy alto; MIT; 3D no |
| Kaplay | sucesor de Kaboom [NV versión] | 2D simple y rápido | nativo | alto; menos documentación |
| **Three.js** | WebGPURenderer con fallback WebGL2 (experimental); r18x [NV] | 3D/2.5D, shaders, low-poly | nativo | alto; stack de los 3 primeros de Vibe Jam 2026; física/colisiones a construir o integrar |
| Babylon.js 9 | 26-mar-2026 | 3D con más incluido (física, GUI) | nativo | medio-alto |
| PlayCanvas 2.x | MIT, editor en la nube | 3D web | nativo | medio (editor) |
| **Godot 4.7** | jun-2026, 4.8 beta; MIT | 2D/3D con editor | export WebGL2 (Compatibility); **C# no exporta a web**; requiere headers/threads | medio: escenas .tscn texto pero conflictivas; mejor en 2D con plantillas |
| Unity 6.x | 6.6 WebGPU en web [NV]; Personal gratis < US$200k | 2D/3D maduro | WebGL/WebGPU, builds pesados | medio-bajo: escenas/prefabs, setup |
| Unreal 5.8 | última UE5; sin export web oficial | 3D AAA | no | bajo para 10 h; descartar |
| Bevy 0.19 | Rust, wasm | ECS | sí | bajo: compilación y curva |
| PICO-8 / LÖVE | fantasy console Lua / LÖVE 12 en desarrollo | retro 2D | PICO-8 sí | estética limitada, nicho |

## Decisión (20-11-2026)
- **Three.js** es el motor (ver `DECISIONES.md`). La tabla y la recomendación de abajo quedan como contexto histórico.

## Recomendación condicional (propuesta, superada por la decisión)
- 2D web → Phaser 4 (o canvas puro si es una mecánica).
- 3D pequeño / estilo shader-neón / low-poly → Three.js.
- Godot solo si Dani/Renato lo dominan y se valida export web antes del lunes.
- Unity/Unreal: no, salvo experiencia fuerte del equipo y aceptar demo desktop.
- Spike de 90 min fuera del repo oficial para decidir: misma escena (movimiento, objetivo, reinicio, un sonido) en 2 candidatos; medir tiempo, errores, build limpio en Mac/Windows, prueba de una persona ajena.
- Licencias: motor ≠ derechos de assets; repo debe ser open source.

## 2.5D con Three.js — factibilidad (preferencia, no decisión; 20-11-2026)
Definición usada: mundo 3D (piso, luces, sombras, VFX) + personajes/jefes como recortes 2D (billboards) + cámara fija sin giro. Gameplay en el plano XZ.

**Técnica recomendada**
- `OrthographicCamera` con inclinación fija (~50°) y sin yaw: escala constante en toda la arena → distancias, alcances y telegrafías se leen igual cerca y lejos (perspectiva achica el fondo).
- Billboards con la misma rotación que la cámara (fija → se calcula una vez). Planos paralelos ⇒ el depth buffer ordena por la z del pie, sin sort manual ni z-fighting. `alphaTest` para bordes nítidos.
- Personajes "cut-out": piezas (cuerpo, cabeza, patas) en un atlas por personaje; animación por rotación/escala de piezas (squash & stretch). Arte procedural en Canvas2D (sin archivos) o sprites IA con anclas.
- Sombra blob bajo cada actor = posición real en el piso (clave cuando salta/flota). Shadow map solo para escenografía estática (`shadowMap.autoUpdate=false`).
- Three moderno (r18x): color management sRGB, luces físicas, `InstancedMesh` para balas/eslabones, pools. three ≥ r160 no trae build global: para file:// se empaqueta una vez a IIFE (`esbuild --format=iife --global-name=THREE`) y se versiona en `vendor/`.

**Estética** (+) lee como ilustración/diorama, contorno de tinta y colores planos = alta legibilidad y personalidad con poco arte; encaja con criterios "arte visual" y "pulido". (+) agentes generan sprites 2D mejor que modelos 3D. (−) personajes sin vista frontal/trasera (solo espejo izq./der.) salvo pintar más poses. (−) mezclar 3D realista con recortes planos puede chocar: mantener escenografía simple y paleta común.

**Jugabilidad** (+) top-down 3/4 es el estándar de boss rush/coop (Hades, Enter the Gungeon); telegrafías en el piso se leen perfecto en ortográfica. (+) colisiones siguen siendo 2D (círculos/segmentos): nada de física 3D. (−) actores altos tapan lo que está detrás: limitar altura, transparentar o contorno de lo ocultado. (−) altura (saltos, vuelo) se lee solo con sombra + escala.

**Riesgo para 10 h**: bajo-medio. Es lo mismo que un juego top-down 2D más una cámara 3D; lo caro es el arte de personajes (pipeline de sprites). Prueba real: AtaDos v0.4 (2.5D) en `~/Documents/AtaDos`.
