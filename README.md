# Turno Cero · Brasa Burger

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

El **cooperativo online admite 2–4 guardias**. El anfitrión crea una sala, comparte el código y empieza cuando llega al menos otro jugador. El servidor remoto predeterminado es el servicio existente de Render; debe desplegar esta revisión y estar disponible. Se puede configurar otra dirección de servidor HTTP/HTTPS en el menú. La lógica y los recursos se validan en el servidor; el cliente envía entradas, nunca posiciones o daño. No hay chat de voz ni cuentas.

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

## Estado y validación

Es una primera noche jugable: modelos, sonidos, animaciones y equilibrio son provisionales. Quedan para futuras versiones la historia desarrollada, otras noches, ajustes de accesibilidad adicionales, animaciones de captura más elaboradas y pruebas amplias de rendimiento y compatibilidad Windows.

`npm test` comprueba reloj, preparación, navegación por todas las salas, colisiones y puertas, recursos, escondites, patrones básicos, guardado y restauración, victoria/derrota, capacidad de salas, autoridad del anfitrión, pausa individual, clientes WebSocket reales y acceso a archivos. La revisión en Chromium cubre menú, inicio del turno, cámaras reales y guardado. No equivale a validar el ejecutable en Windows ni el servidor público.

La prueba visual opcional se ejecuta con `python3 scripts/smoke-browser.py`, teniendo el servidor activo, Python Playwright y Chromium. `TURNO_URL` y `CHROMIUM_PATH` permiten cambiar el servidor y el ejecutable del navegador.
