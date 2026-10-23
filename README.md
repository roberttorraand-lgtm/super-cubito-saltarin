# Turno Cero · Brasa Burger 0.5

Juego de terror en primera persona para Windows 10/11 x64. La edición 0.5 migra el renderizado de Three.js a **Babylon.js 9.32**; Electron mantiene la aplicación portable. No utiliza Godot. Conserva las cinco noches, el cooperativo con anfitrión y los guardados de 0.3/0.4.

## Descargar y jugar

En [GitHub Actions](https://github.com/roberttorraand-lgtm/super-cubito-saltarin/actions/workflows/windows-download.yml), abre la ejecución más reciente de **Descargar juego para Windows**. Cuando termine correctamente, baja a **Artifacts** y descarga **TurnoCero-0.5-Windows-x64**. GitHub exige iniciar sesión. Los artefactos duran 14 días; **Run workflow** genera otro. El flujo solo tiene permiso de lectura del repositorio y no publica releases.

Extrae **todo el ZIP** y abre `TurnoCero.exe`. Mantén `resources`, las bibliotecas y demás archivos en su carpeta. No necesitas instalar Node.js, Blender ni abrir un navegador. El programa aún no tiene instalador ni firma de código.

La compilación de Actions se hace en Windows y ejecuta las pruebas, pero no abre la ventana del juego ni mide FPS. El paquete local se genera desde Linux. Las capturas y pruebas visuales de este repositorio usan Chromium/Linux con SwiftShader; todavía hace falta probar la nueva edición en hardware Windows real.

## Controles y recursos

- WASD: moverse; ratón: mirar tras hacer clic en la escena. Mayús: correr con resistencia limitada; C: agacharse.
- E: puertas, escondites, recarga y latas. F: linterna. Tab: teléfono. G: lanzar una lata. Esc: menú.
- Individual: la pausa detiene el reloj. Cooperativo: la noche continúa; solo el anfitrión guarda.

El turno dura **16 minutos reales**, de 23:00 a 07:00. Los primeros dos minutos son preparación segura. El teléfono ofrece seis cámaras reales y comparte batería con la linterna. Se recarga junto a la base de seguridad, con el teléfono guardado; pulsar E repetidamente no regala batería. Las dos puertas blindadas tienen reservas independientes, gastan cerradas y recargan abiertas. No pueden cerrarse sobre un guardia.

Hay tres escondites y tres latas, con reposición limitada por tiempo. Si te ven esconderte, pueden encontrarte; después de cierto tiempo tu respiración te delata. Un guardia caído observa al equipo. Basta con que uno alcance las 07:00 para ganar.

## Cinco noches

| Noche | Turno | Dificultad |
| --- | --- | --- |
| 1 | Contrato de prueba | Aprende las cuatro amenazas; el Asador despierta a las 03:00. |
| 2 | Fuera de horario | Más velocidad, oído y memoria; salidas más tempranas. |
| 3 | Fallo de suministro | Cortes de 16 s cada 180 s de peligro, con aviso 8 s antes. |
| 4 | El turno compartido | Soldador comparte tu última posición; Asador desde la 01:00; cortes de 20 s cada 150 s. |
| 5 | Última nómina | Los cuatro salen a medianoche; cortes de 22 s cada 120 s y máxima presión. |

Cada noche tiene presentación, instrucciones en Esc y cierre. Ganar desbloquea la siguiente; perder no borra progreso. Puedes repetir noches. En cooperativo, los invitados juegan la noche elegida por el anfitrión aunque aún no la tengan desbloqueada; una victoria cuenta para los participantes conectados, pero los desbloqueos siguen exigiendo las noches anteriores.

Los cortes empiezan después de un intervalo completo de peligro: nunca en preparación. Fallan cámaras y recarga, se atenúa el local y se conserva la linterna y la reserva de cada puerta. El HUD avisa y muestra la duración restante. Las noches posteriores también reducen la duración de las latas, aumentan su espera de reposición y acortan el tiempo seguro en los escondites (45 s en la primera; 29 s en la quinta).

## Restaurante y modelos

Las nueve zonas conservan las colisiones y navegación compartidas por guardias y enemigos. Cocina y mostrador contienen equipo de servicio; el comedor, mesas y comida; seguridad, monitores, base y un plano real de las nueve zonas; vestuarios y almacén, refugios y suministros. Hay señalización consistente, carteles originales, cortinas, luminarias y conducciones. El detalle adicional se coloca sobre muebles y paredes o en el techo, respetando los huecos transitables. La tarima visual entre los pedestales es plana; los volúmenes de los pedestales siguen las colisiones.

Los **cuatro modelos glTF se han esculpido mediante un script original de Blender**, con bordes biselados, rodamientos, pistones, juntas, dedos, placas y accesorios distintos:

- **Padre Prisma:** rizos, gafas, estola, túnica y cable óptico. Detecta teléfonos y se frena con la linterna.
- **Chef Soldador:** delantal, visor, depósitos, filtros, manguera y herramienta. Oye carreras y distracciones; en noches avanzadas alerta a los demás.
- **Don 67:** gafas negras, mandíbula pronunciada, camisa y collar floral. Se detiene cuando lo observas sin teléfono.
- **El Asador:** armadura asimétrica, cuerno roto, chimeneas, cableado y núcleo de horno. Acelera por ráfagas y golpea las puertas.

Cada GLB contiene clips **Idle, Walk y Attack**. La marcha mezcla sus articulaciones según el movimiento real; el ataque se usa al golpear puertas y durante la captura. Los compañeros también articulan brazos y piernas. Se suavizan posiciones y giros, y los pasos/balanceo de cámara requieren desplazamiento real. Las entradas se envían a un ritmo independiente del dibujo, con un límite para descartar retrasos largos.

Hay siete juegos de superficies originales de 512 px con mapas de normales: baldosa, yeso, acero, madera, tela, goma y esmalte. Se usan filtrado trilineal, normales de superficie y materiales PBR en los modelos detallados. Todos los archivos están instalados localmente: no hay modelos, HDR, decodificadores ni texturas que descargar de una CDN durante el individual. La pantalla de entrada espera a que el restaurante esté listo y comunica fallos de carga.

## Gráficos y rendimiento

El objetivo artístico es final de PS2/inicio de PS3, con siluetas, materiales y luces más trabajados. No es renderizado por trazado de rayos ni una promesa de aspecto o rendimiento AAA.

- **Detallado · PS2 / PS3:** hasta 1280 × 800 internos, modelos PBR, normales, hasta dos luces cercanas por vista, linterna con sombras PCF y resplandor limitado a elementos emisivos.
- **Ligero:** hasta 640 × 400 internos, materiales simples y geometría agrupada por articulación con colores por vértice; conserva siluetas y clips, desactiva normales, sombras y resplandor. La luz del local se precalcula en los vértices y la linterna usa un shader sencillo en Babylon para limitar el coste por píxel. El HUD mantiene su resolución.
- **Automática:** reduce progresivamente la resolución y activa el perfil ligero si hay fotogramas lentos. No vuelve a subir calidad automáticamente durante la partida.

La arquitectura fija se agrupa por material y sector, congelando matrices. Las paredes y puertas cerradas ocultan personajes que no son visibles desde cada vista. Las cámaras usan el mismo motor y escena mediante una textura de render, leída a menor frecuencia hacia el teléfono; no duplican el mundo en otro motor. El modo ligero también reduce esa imagen de 384 × 216 a 256 × 144. La preferencia de movimiento reducido suprime balanceo, sacudidas y reposo decorativo.

En opciones puedes mostrar FPS, resolución y llamadas de dibujo por fotograma. Son medidas reales, no valores objetivo. La inspección con los cuatro modelos juntos es una carga distinta de la vista inicial del guardia; el informe diferencia ambas. Los resultados SwiftShader no predicen el rendimiento de una GPU Windows. El equilibrio y el rendimiento requieren más pruebas reales.

## Guardado y cooperativo

El individual funciona sin Internet: Electron inicia un servidor privado en bucle local y un puerto libre. El cooperativo es para **2–4 guardias**. El PC anfitrión simula a 30 pasos/s en un worker y envía estados compactos 10 veces/s. Cada equipo carga su mapa, modelos y texturas locales. El servicio de Render solo enlaza por código, negocia WebRTC o retransmite paquetes si hace falta: no simula el cooperativo.

La conexión directa está implementada, pero no se ha validado entre redes domésticas: la política administrada de Chromium del entorno bloquea los candidatos UDP. Sí se prueban SDP/ICE y la retransmisión real. Las conexiones directas están diseñadas para sobrevivir a la pérdida del servicio de encuentro; las retransmitidas lo necesitan. Si sale el anfitrión, acaba la sesión; no hay migración automática. Todos deben actualizar a 0.5 para ver los nuevos recursos; el protocolo de juego sigue siendo compatible con 0.4.

Esc → guardar escribe `turno-cero.json` en los datos de la aplicación. Conserva noche, reloj, personajes, recursos y puertas. El progreso automático se guarda aparte en `campana.json`. Un turno nuevo reinicia recursos. Para continuar cooperativo, el anfitrión carga su guardado y comparte un código nuevo; los invitados ocupan los puestos guardados por orden de entrada. En desarrollo se usa almacenamiento local del navegador. Si falla una escritura, se avisa. No hay guardado en la nube.

## Desarrollo y validación

```sh
npm ci
npm test
npm run desktop
```

Node.js 22 o superior. `npm start` sirve el juego en `http://localhost:3000`; `PORT` y `HOST` son opcionales. Render instala dependencias de producción y desactiva el individual público: allí solo funciona el enlace cooperativo. Electron mantiene aislamiento de contexto, sandbox y preload limitado al guardado y controles de ventana.

```sh
npm run package:win
```

Genera `dist/Turno Cero-win32-x64`, con runtime Electron oficial. No se necesita Blender para jugar ni empaquetar. Para regenerar los recursos originales:

```sh
blender -b -t 2 --python scripts/build-models.py
python3 scripts/build-textures.py
```

El segundo comando requiere Pillow. Los GLB y PNG generados están versionados para que las compilaciones usen exactamente los recursos revisados.

`npm test` comprueba simulación, campaña, reloj, navegación, puertas, recursos, escondites, enemigos, guardado, victoria/derrota, autoridad del anfitrión y retransmisión. También valida estructura GLB, clips, límite de geometría, autonomía de los modelos y dimensiones de texturas.

`python3 scripts/campaign-browser.py` verifica cinco victorias, desbloqueo, persistencia, cortes, recursos de otro turno y elección de noche cooperativa. Usa guardados próximos al amanecer: no representa cinco noches completas sobrevividas manualmente. `python3 scripts/render-browser.py`, con `npm start` activo, comprueba el render real, clips, movimiento, perfiles, seis vistas CCTV y guardado; su alineación de modelos es una escena explícita de inspección. Requieren Python Playwright y Chromium. `scripts/hosted-browser.py` comprueba la ruta automática y forzada del enlace, con la limitación de WebRTC indicada anteriormente.

Capturas de 0.5 e informes en `docs/screenshots`: [modelos](docs/screenshots/v0.5-modelos.png), [seguridad](docs/screenshots/v0.5-seguridad.png), [cámaras](docs/screenshots/v0.5-camaras.png), [restaurante](docs/screenshots/v0.5-restaurante.png), [render](docs/screenshots/babylon-verification.json), [campaña](docs/screenshots/campaign-babylon-verification.json).

## Hardware orientativo

Punto de partida para perfil Ligero en ventana de 720p (render interno reducido): Windows 10/11 x64, Intel Core i3-8100 o Ryzen 3 3100, **8 GB de RAM**, GTX 1050/RX 560 de **2 GB** y **1 GB libre**. Para calidad detallada conviene una GPU superior. El anfitrión necesita además una conexión estable y capacidad para la simulación. Es una recomendación provisional sin medir en ese hardware; no garantiza FPS.
