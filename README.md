# Super Cubito Saltarín

Plataformas cooperativo online para 2–4 jugadores, ahora con **3 vidas por mundo**, 48 enemigos absurdos, memes PNG, muelles y cintas transportadoras. Cuatro recorridos diseñados individualmente en `levels.js`, cada uno con geometría, ambientación y obstáculos propios:

| Mundo | Retos propios |
| --- | --- |
| Bosque de las copas | Desniveles, troncos que hay que saltar, espinos y una torre de dos cubitos para abrir el paso. |
| Cañón de los puentes | Dos barrancos con pasarelas cooperativas de 380 y 430 píxeles, sierras móviles y rutas entre mesetas. |
| Glaciar del deshielo | Dos placas derriten una barrera; el hielo reduce la tracción y los puentes frágiles se rompen tras pisarlos. |
| Constelación de los saltos | Gravedad reducida, plataformas suspendidas, puente de energía y barreras que se encienden y se apagan. |


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
- Cada jugador empieza cada mundo con **3 vidas**. Una caída o un golpe consume una; reapareces en tu último punto de control con 1,5 segundos de protección frente a contactos.
- Con cero vidas pasas a espectador y la cámara sigue a un compañero vivo. Los supervivientes pueden completar el mundo y todos recuperan tres vidas al pasar al siguiente.
- Si todos quedan KO, el equipo debe votar para reintentar el mismo mundo con tres vidas nuevas. También se puede acordar el reinicio si un compañero está fuera y lo necesitáis para un mecanismo.
- Los cubitos chocan entre sí. Salta y aterriza sobre un compañero para formar una torre; el de abajo puede transportar a los de arriba. En la meta dejan de bloquear a los demás.
- En el bosque, un muro de 156 píxeles requiere saltar desde otro cubito. Quien lo cruza pisa la placa del otro lado para abrir el paso al resto.
- En el cañón y la luna, ocupad dos placas distintas durante 12 pasos de simulación (aproximadamente 0,2 segundos) para construir cada puente. En el glaciar, dos placas derriten la barrera inicial.
- Las puertas y puentes permanecen activados hasta cambiar de mundo o reiniciar la partida, aunque un jugador salga o muera. Se pueden incorporar compañeros nuevos después de abrirlos.
- Las sierras del cañón recorren raíles y obligan a calcular el salto.
- En el glaciar frena antes de llegar al borde. El hielo frágil se rompe 42 pasos después de pisarlo y vuelve tras 180 pasos (tres segundos), cuando no hay un cubito dentro.
- En la luna el salto dura más. Las barreras de energía alternan 80 pasos activas y 100 apagadas; su estado aparece en el escenario.
- Capibaras con gafas, tostadoras voladoras, plátanos astronautas y patos musculosos patrullan los mapas. Saltarles encima los derrota para toda la sala; un contacto lateral consume una vida.
- Los muelles `BOING.EXE` lanzan al cubito sin gastar vidas. Las cintas del cañón empujan al jugador en sentido contrario.
- Las banderas intermedias guardan tu punto de reaparición en ese mundo; no recuperan vidas.
- Se requieren al menos dos jugadores conectados para completar un mundo. Deben llegar a la meta todos los jugadores que siguen con vidas y marcarse todos como listos para pasar juntos al siguiente.
- Tras el cuarto mundo, el equipo puede reiniciar la aventura en la misma sala.

## Fluidez y sincronización

La física compartida en `game.js` utiliza pasos fijos de 60 Hz, aceleración, frenado, salto variable, un margen de seis pasos para saltar tras abandonar una plataforma y un búfer de siete pasos para pulsaciones ligeramente anticipadas. El servidor controla posiciones, colisiones y avance de mundos; los clientes solo envían intenciones numeradas.

El servidor simula primero el movimiento de todos los cubitos y después resuelve los contactos entre ellos, el transporte sobre compañeros y los mecanismos. El reloj usado para dibujar las sierras, el hielo y las barreras corresponde al usado en la predicción local. Los estados de puertas, placas y puentes pertenecen a cada sala y se envían a todos sus jugadores.

El navegador predice sus propios movimientos y vuelve a simular las entradas pendientes al recibir la confirmación del servidor. Los compañeros se dibujan interpolando 30 instantáneas por segundo sobre el reloj de simulación del servidor, con un margen adaptativo de unos 67 ms en conexiones estables y hasta 150 ms cuando varía el retraso. Las reapariciones no se interpolan a través de todo el mapa. El servidor simula como máximo una entrada por jugador y paso. Tras una ráfaga de red conserva como máximo cuatro entradas para simular, descarta movimiento obsoleto y conserva una pulsación corta de salto; así evita reproducir hasta medio segundo de órdenes atrasadas. Los estados se serializan una vez por sala y se omiten para sockets con más de 32 KiB pendientes, sin dejar crecer una cola de imágenes antiguas.

El renderizado usa `requestAnimationFrame`, cámara con suavizado independiente de la frecuencia de pantalla, fondos precalculados, descarte de objetos fuera de cámara y un máximo de 120 partículas. Incluye deformación al saltar y aterrizar, polvo, banderas animadas, paralaje, minimapa y paisajes propios. Respeta la preferencia de movimiento reducido para efectos decorativos. El reloj de presentación nunca retrocede al cambiar el margen de red. Las transiciones entre interpolación y predicción cercana se suavizan, así como las pequeñas correcciones de contacto. Los contactos cercanos se predicen con copias de los compañeros y se corrigen con las confirmaciones del servidor; las aperturas de mecanismos se muestran solo cuando las confirma el servidor. La fluidez final depende del dispositivo y de la conexión; la predicción no elimina la latencia real entre jugadores.

## Validación

```sh
npm test
```

Las pruebas cubren física, altura de salto, tolerancia de entrada, puntos de control, recorrido completo de los cuatro mundos con dos actores usando entradas legales, resolución de muros y puentes, apilamiento y transporte de cuatro cubitos, choques contra paredes, desaparición de un soporte, activación de placas por compañeros distintos, sierras móviles, diferencias de tracción y gravedad, rotura y restauración del hielo, pulsos de energía, correspondencia entre física del servidor y predicción, progresión y reinicio cooperativos, reconciliación, interpolación, conexiones WebSocket reales, aislamiento de salas, límite de cuatro jugadores, validación de origen y disponibilidad HTTP. Las pruebas de red cubren además ráfagas de entradas, conservación de pulsaciones cortas, reloj monotónico con variaciones de retraso, interpolación a 30 Hz y transiciones suaves al entrar en contacto. También se comprueban agotamiento exacto de tres vidas, modo espectador, reinicio por consenso, restauración de vidas en cada mundo, combate con enemigos y servicio del PNG. No se requieren servicios externos.

Comprobaciones de navegador: crear una sala en un contexto, unirse desde otro, comprobar ambos nombres, mover y saltar, entrar y salir de pantalla completa y repetir con controles táctiles. Para validar latencia, introducir 125 ms de retraso en cada sentido del WebSocket: el movimiento local debe dibujarse antes de la confirmación y converger a la posición del servidor al detenerse.

## Publicación

`render.yaml` configura un único servicio Node en Render, con instalación y pruebas antes de arrancar y comprobación `/health`. El despliegue requiere **WebSockets persistentes** y una sola instancia. En otros proveedores, usa HTTPS/WSS y configura el proxy para permitir la actualización WebSocket y pasar el host público. Comparte la dirección pública del alojamiento. Una dirección localhost solo sirve para pruebas locales.

Las salas viven en memoria: un reinicio o despliegue interrumpe las partidas. No hay reconexión automática, cuentas ni guardado permanente. Las vidas están asociadas al jugador conectado a la sala; no existe identidad persistente entre sesiones. La historia y los power-ups quedan para una próxima versión. El plan gratuito de Render puede entrar en reposo cuando no hay uso; la siguiente carga tardará más mientras arranca el servidor.

## Imágenes de memes

`public/assets/meme-atlas.png` contiene cuatro recortes originales generados para este juego, con fondo transparente. El renderizador dibuja cada cuadrante directamente: no necesita enlaces externos ni descargar imágenes durante la partida. Las posiciones y animaciones de los enemigos se calculan a partir del reloj compartido del mundo; las derrotas las confirma el servidor. Los carteles son decorativos y los enemigos tienen colisión.

### Castillos, secretos y jefes (0.7)

Cada mundo tiene una puerta secreta en su cuarta isla: entra caminando, atraviesa la sala con sus tres guardianes y sal por la puerta del fondo. La primera visita de cada jugador concede tres segundos de escudo. Entrar y salir no restaura vidas.

Al final del recorrido hay un castillo o mansión con interior. La pelea empieza cuando llegan todos los jugadores que siguen vivos. Los cuatro retratos se han adaptado de las imágenes aportadas por el usuario para formar un atlas PNG local.

- That's la Peace: mantened pisados los dos espejos para desactivar su escudo azul.
- Soldador Bai de Feis: saltad hasta el punto más alto sobre las dos válvulas para enfriar la máquina; cuidado con el suelo caliente alterno.
- Gigachad 67: saltad juntos durante la señal «¡YA!» para romper el aura; su onda se evita saltando.
- Señor del Cubo Carmesí: formad una torre de cubitos sobre el sello para romper la armadura; las columnas de fuego se anuncian antes de caer.

Con el escudo desactivado, saltad sobre el retrato. Tres golpes abren la meta. La vida del jefe y los enemigos derrotados se comparten entre todos los jugadores; el servidor valida el combate. Morir dentro devuelve a la entrada de la arena y consume una de las tres vidas del mundo. Si falta un compañero para resolver una mecánica, podéis votar reiniciar el mismo mundo.

Hay 48 enemigos en total, incluidas las patrullas adicionales y los guardianes secretos. Los ataques usan el reloj de simulación compartido, con avisos antes de causar daño.
