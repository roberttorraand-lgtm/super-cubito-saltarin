# Super Cubito Saltarín

Plataformas cooperativo online para 2–4 jugadores. Cuatro mundos conectados: **Pradera de los encuentros**, **Cañón del atardecer**, **Cumbres de cristal** y **Jardines de la luna**. Sus recorridos miden 7.400, 8.550, 9.685 y 10.850 píxeles, con trampas y puntos de control intermedios.

## Desarrollo

Requiere Node.js 22 o superior y npm.

```sh
npm ci
npm start
```

El servidor escucha en `0.0.0.0:3000`. `PORT` y `HOST` son opcionales. `npm run dev` reinicia el servidor al editarlo; reiniciarlo elimina las salas. No necesita cuentas, base de datos ni claves.

Crea una sala y comparte su invitación. Los demás abren la misma dirección pública, escriben su nombre y pulsan **Entrar** con el código. Puedes probar usando dos pestañas. Los jugadores nuevos entran en el mundo actual de su sala.

- A/D o flechas para moverse; espacio, W o flecha arriba para saltar.
- Mantén el salto para llegar más alto; suéltalo antes para dar un salto corto.
- Hay controles táctiles y un botón de pantalla completa cuando el navegador lo permite.
- Los cubitos chocan entre sí. Salta y aterriza sobre un compañero para formar una torre; el de abajo puede transportar a los de arriba. En la meta dejan de bloquear a los demás.
- En cada mundo hay un muro de 156 píxeles que requiere saltar desde otro cubito. Quien lo cruza pisa la placa del otro lado para abrir el paso al resto.
- Un hueco de 330 píxeles exige que dos compañeros ocupen dos placas distintas durante 12 pasos de simulación (aproximadamente 0,2 segundos); así construís un puente para todos.
- Las puertas y puentes permanecen activados hasta cambiar de mundo o reiniciar la partida, aunque un jugador salga o muera. Se pueden incorporar compañeros nuevos después de abrirlos.
- Las sierras móviles recorren raíles y obligan a calcular el salto.
- Las banderas intermedias guardan tu punto de reaparición en ese mundo.
- Se requieren al menos dos jugadores conectados para completar un mundo. Deben llegar todos a la meta y marcarse como listos para pasar juntos al siguiente.
- Tras el cuarto mundo, el equipo puede reiniciar la aventura en la misma sala.

## Fluidez y sincronización

La física compartida en `game.js` utiliza pasos fijos de 60 Hz, aceleración, frenado, salto variable, un margen de seis pasos para saltar tras abandonar una plataforma y un búfer de siete pasos para pulsaciones ligeramente anticipadas. El servidor controla posiciones, colisiones y avance de mundos; los clientes solo envían intenciones numeradas.

El servidor simula primero el movimiento de todos los cubitos y después resuelve los contactos entre ellos, el transporte sobre compañeros y los mecanismos. Los estados de puertas, placas y puentes pertenecen a cada sala y se envían a todos sus jugadores.

El navegador predice sus propios movimientos y vuelve a simular las entradas pendientes al recibir la confirmación del servidor. Los compañeros se dibujan interpolando instantáneas con 100 ms de margen. Las reapariciones no se interpolan a través de todo el mapa. El servidor limita las colas y simula como máximo una entrada por jugador y paso.

El renderizado usa `requestAnimationFrame`, cámara con suavizado independiente de la frecuencia de pantalla, fondos precalculados, descarte de objetos fuera de cámara y un máximo de 120 partículas. Incluye deformación al saltar y aterrizar, polvo, banderas animadas, paralaje, minimapa y paisajes propios. Respeta la preferencia de movimiento reducido para efectos decorativos. Los contactos cercanos se predicen con copias de los compañeros y se corrigen con las confirmaciones del servidor; las aperturas de mecanismos se muestran solo cuando las confirma el servidor. La fluidez final depende del dispositivo y de la conexión; la predicción no elimina la latencia real entre jugadores.

## Validación

```sh
npm test
```

Las pruebas cubren física, altura de salto, tolerancia de entrada, puntos de control, recorrido completo de los cuatro mundos con dos actores usando entradas legales, resolución de muros y puentes, apilamiento y transporte de cuatro cubitos, choques contra paredes, desaparición de un soporte, activación de placas por compañeros distintos, sierras móviles, progresión y reinicio cooperativos, reconciliación, interpolación, conexiones WebSocket reales, aislamiento de salas, límite de cuatro jugadores, validación de origen y disponibilidad HTTP. No se requieren servicios externos.

Comprobaciones de navegador: crear una sala en un contexto, unirse desde otro, comprobar ambos nombres, mover y saltar, entrar y salir de pantalla completa y repetir con controles táctiles. Para validar latencia, introducir 125 ms de retraso en cada sentido del WebSocket: el movimiento local debe dibujarse antes de la confirmación y converger a la posición del servidor al detenerse.

## Publicación

`render.yaml` configura un único servicio Node en Render, con instalación y pruebas antes de arrancar y comprobación `/health`. El despliegue requiere **WebSockets persistentes** y una sola instancia. En otros proveedores, usa HTTPS/WSS y configura el proxy para permitir la actualización WebSocket y pasar el host público. Comparte la dirección pública del alojamiento. Una dirección localhost solo sirve para pruebas locales.

Las salas viven en memoria: un reinicio o despliegue interrumpe las partidas. No hay reconexión automática, cuentas ni guardado permanente. La historia y los power-ups quedan para una próxima versión. El plan gratuito de Render puede entrar en reposo cuando no hay uso; la siguiente carga tardará más mientras arranca el servidor.
