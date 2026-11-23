# Dirección audiovisual y audio (para Diego y agentes)

## Identidad producible en 1 hoja
- Emoción principal, 3 adjetivos (visual+sonoro), paleta 5 colores con contraste, siluetas jugador/amenaza/objetivo, material dominante, ritmo, familias de instrumentos, sonidos prohibidos.
- Tabla `evento → intención → visual → audio → prioridad` (ej. daño → peligro → destello silueta → golpe grave corto → alta). Leer por color **y** forma; audio nunca es la única señal.
- Validar en 1 pantalla (jugador, peligro, objetivo, UI) antes de producir más. Probar en escala de grises y con sonido apagado.

## Prompts base
- Sprite: «Personaje original [tema], vista [cenital 3/4], luz arriba-izquierda, 4 poses mismo tamaño/silueta/punto de apoyo, contorno legible en miniatura, paleta [X], fondo transparente, sin texto». Aprobar 1 pose antes del set; ajustar anclas en motor.
- Telegrafía de ataque: 3 cuadros (aviso que se contrae → destello de impacto → disipación), legible en grises; sincronizar con inicio/impacto/fin y que se limpie al cancelar.
- Música: «Instrumental [ambiente], 96 BPM 4/4, [instrumentos], sin voz, 8 compases loopeables (=20 s), sin cierre, espacio para SFX». Pedir variantes calma/peligro + stinger. Cortar loop en DAW; generador no garantiza empalme ni stems alineados.
- SFX: UI clic ~120 ms; impacto con cola 250 ms (3 variantes, limitar concurrencia); ambiente 20 s loop.

## Integración
- Buses música/UI/SFX/ambiente con volumen y mute; prioridad a daño/alertas; cambios de capa musical al compás con histéresis.
- Web: audio requiere primer gesto del usuario; probar mute, pestaña en background, reinicio rápido.
- Nombres `categoria_evento_variante_vN`; guardar fuente, licencia, autor, fecha en manifiesto/CREDITS.

## Licencias (riesgo para repo público)
- Suno: plan gratis = no comercial; suscripción posterior no da derechos retroactivos (https://help.suno.com/en/articles/2410177). Studio exporta stems/MIDI según plan.
- ElevenLabs SFX: términos restringen distribuir salidas como archivos sueltos/librerías (https://elevenlabs.io/creative-terms) → **conflicto posible con subir assets a repo público**. Alternativas: jsfxr/ZzFX (audio procedural en código, sin archivos), grabación propia, librerías CC0 (Kenney, freesound CC0).
- Licencia del código no cubre assets. Registrar todo en CREDITS.

## Práctica de 45 min para Diego
Hoja de estilo + 3 SFX propios (teléfono + edición) + loop 20 s calma/peligro; comprobar qué feedback se entiende sin explicación.

Ver también: estilos y herramientas de generación en `generos-y-estilos.md`.
