# Turno Cero · Brasa Burger 0.3

Prototipo gratuito de terror en primera persona para Windows 10/11 de 64 bits, programado con Three.js y Electron. No utiliza Godot. La aplicación descargable abre su propia ventana y funciona sin abrir un navegador ni instalar herramientas de desarrollo.

## Jugar en Windows

Extrae **toda la carpeta del ZIP** y abre `TurnoCero.exe`. No se debe separar el ejecutable de `resources`, las bibliotecas y los demás archivos incluidos. Es un programa portable, todavía sin instalador ni firma de código. Se ha generado el paquete de Windows desde Linux; aún necesita una prueba en un PC Windows real.

La noche dura **16 minutos reales**: de 23:00 a 00:00 tienes dos minutos para prepararte; desde medianoche debes sobrevivir hasta las 07:00. La hamburguesería contiene nueve zonas conectadas: seguridad, escenario, cocina, recreativas, comedor, mostrador, gerencia, vestuarios y almacén.

- **WASD / flechas arriba y abajo:** moverse; ratón para mirar tras hacer clic en la escena.
- **Mayús:** correr, consumiendo resistencia y haciendo ruido. **C:** agacharse.
- **E:** usar puertas, esconderse, salir, recargar o recoger latas.
- **F:** encender/apagar la linterna. **Tab:** abrir/guardar el teléfono.
- **G:** lanzar una lata para distraer. Hay tres; el dispensador permite reponerlas con un intervalo de 45 segundos.
- **Esc:** menú y manual. En individual pausa el turno; en cooperativo la noche continúa.

El teléfono ofrece seis cámaras que renderizan el escenario real, incluidos animatrónicos y compañeros. Tiene batería finita; con el teléfono guardado puedes recargarla cerca de la base de seguridad. La linterna también consume lentamente la batería. Dos puertas blindadas tienen reservas independientes: gastan al cerrarse, se abren si se agotan y recargan abiertas. No pueden cerrarse sobre un guardia.

Los escondites bloquean el movimiento mientras estás dentro y conservan una salida válida. Si un enemigo te ve entrar puede encontrarte durante los segundos siguientes. Tras 45 segundos seguidos en un escondite, la respiración puede atraer a los enemigos cercanos; no basta con permanecer escondido toda la noche. Los compañeros muertos observan a los supervivientes; si todos mueren, termina la partida. Basta con que un guardia alcance las 07:00 para que el equipo sobreviva.

## Animatrónicos originales

Los modelos mecánicos se construyen con geometría 3D propia, inspirada en las cuatro referencias del proyecto anterior:

- **Padre Prisma:** rizos, lentes azules y traje ceremonial. Detecta teléfonos cercanos; la linterna frontal lo aturde brevemente, con un intervalo entre aturdimientos.
- **Chef Soldador:** cocinero industrial con delantal, depósito y herramienta verde. Oye carreras y distracciones a mayor distancia.
- **Don 67:** mandíbula mecánica, gafas doradas y camisa estampada. Se detiene al ser observado directamente, sin usar el teléfono.
- **El Asador:** armadura quemada y cables rojos. Despierta a las 03:00, acelera por ráfagas y golpea las puertas para consumir su reserva.

Tienen patrulla, investigación y persecución, con navegación sobre los mismos obstáculos que la física del jugador. El juego usa materiales con texturas procedurales y filtrado de píxel, luces por sala, linterna con sombras, cámaras a mayor resolución, animación de articulaciones y sonido sintetizado. La preferencia de movimiento reducido desactiva balanceo de cámara y movimientos decorativos.

## Individual, cooperativo y guardado

El **individual funciona sin Internet en el ejecutable**: el programa inicia un servidor privado en una dirección de bucle local y un puerto libre. El navegador de desarrollo requiere que esté ejecutándose `npm start`.

El **cooperativo online admite 2–4 guardias y lo simula el ordenador del anfitrión**, en un worker separado del dibujo. Cada instalación ya contiene el mapa, las texturas y los modelos: no se descargan del anfitrión ni se envían en los estados de red. El anfitrión valida entradas y calcula enemigos, recursos, puertas y victoria a 30 pasos por segundo; envía estados compactos diez veces por segundo. Solo él puede empezar y guardar la partida.

El servicio de Render sirve como punto de encuentro por código y negocia WebRTC. Se intenta un canal de datos directo anfitrión–invitado. Si la red lo impide, se usa retransmisión WebSocket: **el servicio reenvía los paquetes, pero no simula la partida**, incluso en esta ruta. No hace falta abrir puertos manualmente. La interfaz indica quién es el anfitrión y cuándo se usa el enlace de apoyo. Todos los jugadores necesitan la versión 0.3; el protocolo rechaza clientes incompatibles.

Las conexiones directas ya establecidas están diseñadas para continuar si se pierde el punto de encuentro. Las conexiones que usan retransmisión sí lo necesitan mientras juegan. Si el anfitrión sale o cierra el programa, la partida termina para los invitados; no hay transferencia automática de anfitrión. El anfitrión puede volver a crear una sala desde su guardado local. Su ordenador debe permanecer encendido.

El punto de encuentro predeterminado sigue siendo Render y debe desplegar esta revisión. En el plan gratuito su arranque puede tardar; el mapa se carga localmente independientemente de esa espera. Se puede cambiar su dirección y forzar el enlace de apoyo en las opciones. En Render se deshabilita la simulación individual pública; el programa de Windows ejecuta el individual en su servidor privado de bucle local.

Desde Esc, el anfitrión puede guardar manualmente en su ordenador. En Electron se escribe atómicamente `turno-cero.json` en la carpeta de datos de usuario de la aplicación (`%APPDATA%\turno-cero` normalmente). El guardado conserva hora, posiciones, batería, latas, supervivientes y reservas de puertas. Al continuar, el anfitrión crea una nueva sala y comparte su nuevo código; los participantes ocupan los puestos guardados según su orden de entrada. Las rutas y las intenciones momentáneas de los enemigos se recalculan al cargar. Una partida terminada no se puede continuar. En la vista de desarrollo se usa almacenamiento local del navegador.

## Desarrollo

Requiere Node.js 22 o superior.

```sh
npm ci
npm test
npm run desktop
```

`npm start` sirve la vista de desarrollo en `http://localhost:3000`. `PORT` y `HOST` son opcionales. Render usa únicamente las dependencias de producción y ejecuta las pruebas antes de arrancar el servidor cooperativo.

```sh
npm run package:win
```

Genera `dist/Turno Cero-win32-x64`. El empaquetado descarga el runtime oficial de Electron y necesita conexión a Internet. `npm run package:linux` permite generar otra plataforma. No hay flujos de publicación automática ni subidas de binarios en este repositorio.

La aplicación usa aislamiento de contexto, sandbox y una interfaz de preload limitada a guardar/cargar, pantalla completa y salir. Las páginas no tienen acceso a Node.js; las nuevas ventanas y la navegación externa están bloqueadas. No requiere claves, base de datos ni recursos gráficos externos durante la partida.

## Gráficos y rendimiento

La geometría fija se agrupa por material; los modelos se agrupan por piezas articuladas. Las paredes y las puertas cerradas también permiten omitir personajes que no se pueden ver, incluyendo una evaluación separada para la cámara del teléfono. La iluminación normal usa luces difusas, tres luces próximas por vista y una linterna con sombras duras retro.

El perfil **Ligero** limita la imagen 3D a un máximo de 640 × 400, desactiva sombras y usa iluminación del local precalculada con una linterna analítica barata. La interfaz sigue dibujándose a la resolución de la ventana y las cámaras tienen su propia imagen. **Automática** reduce gradualmente la resolución y activa este perfil si detecta fotogramas lentos. **Retro detallado** conserva el perfil normal. En opciones se puede mostrar FPS; se mide tiempo real, sin ocultar las pausas largas mediante el delta de física.

El objetivo es mejorar la fluidez; no se garantiza una tasa determinada. Windows 10/11 no describe por sí solo la potencia de un PC. Se necesita un controlador gráfico con WebGL2. Las medidas del entorno de pruebas usan Chromium/Linux y renderizado por software, por lo que no predicen los FPS de una tarjeta gráfica Windows.

## Estado y validación

Es una primera noche jugable para **Windows 10 y 11 de 64 bits**. No se prepara una edición para Windows 7/8. Modelos, sonidos, animaciones y equilibrio siguen siendo provisionales; todavía hacen falta pruebas reales del ejecutable en Windows y de conexiones directas entre redes domésticas.

`npm test` comprueba reloj, navegación, puertas, recursos, escondites, patrones, guardado, victoria/derrota, autoridad del anfitrión, límites de salas, paquetes compactos sin mapa, negociación SDP/ICE y retransmisión. El antiguo punto WebSocket rechaza cooperativo centralizado.

`python3 scripts/hosted-browser.py` comprueba clientes reales, guardado del anfitrión y que el servicio tiene **cero salas simuladas** durante la partida. Verifica tanto la selección automática de la retransmisión como la retransmisión forzada. Guarda capturas y resultados en `docs/screenshots`. La prueba de continuidad sin enlace se ejecuta solo si WebRTC consigue un canal directo. En este entorno Chromium tiene una política administrada que desactiva UDP no transmitido por proxy, por lo que no ofrece candidatos ICE: se registra esta limitación y **no se declara verificada la ruta directa**. La negociación y la ruta de apoyo sí se prueban.

La revisión visual opcional general usa `python3 scripts/smoke-browser.py`, con el servidor activo, Python Playwright y Chromium. `TURNO_URL` y `CHROMIUM_PATH` permiten cambiar dirección y navegador. No equivale a probar Windows ni el servicio público.

Capturas: [menú](docs/screenshots/v0.3-menu.png), [seguridad](docs/screenshots/v0.3-seguridad.png), [cámaras](docs/screenshots/v0.3-camaras.png), [cooperativo](docs/screenshots/v0.3-cooperativo.png) y [perfil ligero](docs/screenshots/v0.3-ligero.png).
