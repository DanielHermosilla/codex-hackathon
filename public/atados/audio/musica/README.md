# Música del juego

Los MP3 originales se conservan en `assets-src/atados/audio/`. El juego carga pistas MP3 u OGG desde carpetas aisladas en `public/atados/audio/musica/`.

| Archivo en el juego | Música | Etapa |
| --- | --- | --- |
| `recorrido-sagrado/tema.ogg` | El Despertar de la Diosa (Voces Sagradas) | Menú, caída y pasillo hasta entrar al nivel del jefe |
| `mirra-fase1/tema.ogg` | Pulso Amenazante | Inicio del combate hasta la mitad de la vida de Mirra |
| `mirra-fase2/tema.ogg` | Poder Divino (Fase 2) | Mitad de vida hasta derrotar a Mirra; entra desde el segundo 45 |
| `victoria-dionisiaca/tema.mp3` | Victoria Dionisíaca (Fiesta Extática) | Tras el golpe final y el sonido de muerte del jefe |

Las pistas se precargan en el menú. El navegador requiere un primer clic, toque o tecla para permitir audio; tras ese gesto comienza la música y continúa durante la caída y el pasillo. Al llegar Mirra a la mitad de vida, la música espera el silencio de transición, suena el estruendo y entra la fase 2. Tras derrotar al jefe, el golpe final y su sonido de muerte preceden la canción de victoria.

Los perfiles y el sintetizador de efectos viven en `src/atados/audio/efectos.js` y `src/atados/audio/sintesis-efectos.js`. Las rutas y reglas se conectan desde el subsistema de audio; los archivos de música usan sus propias carpetas para que cambiar una pista no modifique los efectos.

“Ascenso de Cuerdas”, “Batalla Mitológica” y la versión antigua de “El Despertar de la Diosa” se conservan como referencias y no se reproducen. Confirmar autoría y licencia antes de publicar o distribuir el juego.
