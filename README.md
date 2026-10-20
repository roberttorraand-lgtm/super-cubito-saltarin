# Super Cubito Saltarín

Prototipo de plataformas cooperativo online para 2–4 jugadores. Un servidor compartido sincroniza a los cubitos mediante WebSocket y calcula la física; cada jugador usa su navegador.

## Desarrollo

Requiere Node.js 22 o superior y npm.

```sh
npm ci
npm start
```

El servidor escucha en `0.0.0.0:3000`. `PORT` y `HOST` son opcionales. `npm run dev` reinicia el servidor al editarlo; reiniciarlo elimina las salas. No necesita cuentas, base de datos ni claves.

Crea una sala, copia la invitación y compártela. Tus amigos abren la misma dirección pública e introducen su nombre y el código para entrar. Puedes probar con dos pestañas. A/D o flechas mueven al cubito; espacio, W o flecha arriba saltan. Hay controles táctiles, trampas, reaparición y un punto de control. Todos los jugadores conectados deben alcanzar la meta; se requieren al menos dos para completar el nivel. Las salas admiten incorporaciones durante la partida y desaparecen cuando sale el último jugador.

## Validación

```sh
npm test
```

Las pruebas ejercitan física, reaparición, meta cooperativa, dos conexiones reales, movimiento sincronizado, aislamiento, salas completas y desconexiones. `GET /health` comprueba disponibilidad del servidor.

## Jugar por Internet

Despliega esta aplicación Node en un alojamiento con **WebSockets persistentes**. Usa una sola instancia y HTTPS (el navegador usará WSS); configura el proxy para permitir la actualización WebSocket y pasar el host público. Comparte la dirección pública que te dé el alojamiento. Abrir el juego en localhost solo sirve para pruebas locales: no publica una partida en Internet.

Este prototipo conserva las salas en memoria: un reinicio pierde la partida. No incluye reconexión automática, cuentas, guardado permanente, varios niveles, historia ni power-ups. Estos contenidos se diseñarán después. No está desplegado por defecto.
