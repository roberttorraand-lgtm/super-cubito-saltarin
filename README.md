# Super Cubito Saltarín · Edición Exploradores

Plataformas de navegador con campaña individual y cooperativo online para 2–4 jugadores. Cuatro mundos, tres vidas por mundo, tres power-ups, 56 enemigos, casas habitadas, archivos de memes ocultos y cuatro jefes inspirados en las imágenes aportadas por el usuario.

## Jugar

Escribe tu nombre y elige **Jugar solo · NPCs y secretos** o **Crear una sala**. En cooperativo, comparte la invitación o el código de seis caracteres. El modo individual usa mapas propios y no admite a otros jugadores. Ambos modos requieren conexión al servidor.

- **A/D o ←/→:** moverse.
- **Espacio, W o ↑:** saltar; mantener para un salto alto y soltar para uno corto.
- **E o ↓:** entrar y salir de edificios, hablar o examinar. Hay botones táctiles equivalentes.
- Una caída o un golpe consume una vida. Reapareces en el último punto de control con protección temporal. Las banderas guardan posición y no restauran vidas.
- Las tres vidas se renuevan al cambiar de mundo o reintentarlo. En solitario puedes reintentar inmediatamente; en cooperativo todos deben votar.
- Con cero vidas, observas a un compañero. Los supervivientes pueden terminar por los eliminados. Si una mecánica necesita a alguien que está KO, podéis acordar reiniciar el mundo.

## Mundos ampliados

Las cifras son del recorrido exterior, sin contar casas, salas secretas ni arenas. Cada mundo incorpora seis zonas nuevas y más puntos de control.

| Mundo | Antes | Ahora | Ampliación | Obstáculos |
| --- | ---: | ---: | ---: | --- |
| Bosque de las copas | 6.810 px | 11.470 px | 68 % | Troncos, espinos, jardines colgantes y una torre cooperativa. |
| Cañón de los puentes | 8.070 px | 13.040 px | 62 % | Mesetas, pasarelas de dos placas, cintas y sierras móviles. |
| Glaciar del deshielo | 7.910 px | 13.060 px | 65 % | Deshielo, tracción reducida, puentes frágiles y catedral de cristal. |
| Constelación de los saltos | 8.290 px | 14.010 px | 69 % | Gravedad lunar, puentes de energía, pulsos y ruinas suspendidas. |

Los mapas individuales sustituyen las exigencias simultáneas por interruptores individuales, ajustan hielo y barreras y permiten vencer todos los jefes sin ayuda. En cooperativo los cubitos tienen colisiones: se pueden apilar y transportar unos a otros. Las placas requieren compañeros distintos y quedan activadas hasta reiniciar.

## Casas, habitantes y secretos

Cada campaña tiene doce casas con interiores accesibles. Acércate a una puerta y pulsa **E**: el vecino está dentro. Puedes conversar varias veces para escuchar bromas y pistas, explorar la buhardilla y volver por la puerta. Las casas son zonas seguras. Sus interiores y los cambios de zona se simulan en el servidor; entrar no restaura ni consume vidas.

Hay dieciséis archivos inspirados en memes de 2016 y una sala secreta por mundo. Los archivos no se anuncian con carteles flotantes ni aparecen en el minimapa. Para encontrarlos hay que explorar caminos secundarios, subir a repisas y examinar pistas del entorno. Los vecinos ofrecen pistas sin marcar la ubicación exacta. Los hallazgos se registran una vez por mundo para la sala; los diálogos pertenecen a cada jugador. El contador muestra los archivos recuperados en el mundo actual.

La primera salida de una sala secreta concede a cada jugador tres segundos de escudo. No recupera vidas. La cámara del minimapa se limita a la zona actual y no revela la distribución de interiores ocultos.

## Power-ups y combate (0.10)

Selecciona con **1, 2 y 3**, o toca los iconos transparentes del inventario en móvil. **R** y el botón táctil R usan el seleccionado. Los tres están disponibles desde el principio; cambiar de equipo cancela la carga y conserva combustible y tiempos de recarga.

| Power-up | Uso | Límites y efectos |
| --- | --- | --- |
| 1 · Escopeta inspirada en Ultrakill | Pulsa y suelta R para un proyectil débil. Mantén al menos un segundo y suelta para el explosivo. | El explosivo daña en área y atraviesa la protección frontal de guardianes. Las balas y explosiones no dañan al propietario ni a aliados. Los jefes reciben daño solo cuando su punto débil está abierto. |
| 2 · Jetpack | Mantén R para subir; suelta para caer. | Tres segundos de combustible continuo, barra visible y recarga al pisar suelo sin mantener R. Cambiar de equipo no rellena el depósito. La altura se limita para mantener al cubito dentro de la pantalla. |
| 3 · Banana | Pulsa R para lanzar una granada en arco. | Deja una zona deslizante durante siete segundos. Afecta al lanzador y aliados, enemigos terrestres y jefes. No causa daño directo; los peligros del escenario siguen siendo peligrosos. Dos segundos entre lanzamientos y como máximo dos zonas por jugador. |

Parte de los enemigos tiene varios puntos de vida y un ciclo de patrulla, aviso, ataque y recuperación:

- **Cargadores:** fijan una dirección, avisan y embisten; recuperarse deja una oportunidad para atacarlos.
- **Guardianes:** bloquean proyectiles débiles por delante y lanzan dos ondas sucesivas. Ataca por detrás, aprovecha la recuperación, salta o usa el explosivo.
- **Artilleros voladores:** muestran la dirección del disparo y lanzan tres ráfagas en abanico antes de descansar.

La banana interrumpe los ataques de enemigos terrestres y los hace derrapar. Un jefe que pisa una zona nueva también derrapa, interrumpe su ataque y expone brevemente su punto débil, con un intervalo de protección entre derribos. Las barras y avisos permiten anticipar estos patrones.

El servidor valida combustible, carga, cadencia, daño y superficies resbaladizas. Los proyectiles comprueban todo el trayecto entre pasos para evitar atravesar paredes estrechas. Su cantidad, duración y efectos están limitados; también se predicen localmente y se reconcilian con el servidor.

## Castillos y jefes

Entra al edificio del final con **E**. La pelea comienza cuando llegan todos los jugadores vivos. Mientras esperas puedes volver al exterior desde la entrada.

- **That's la Peace:** espejos que desactivan los rayos; en individual se activan por separado.
- **Soldador Bai de Feis:** válvulas que se activan al alcanzar la parte alta del salto y suelo caliente alterno.
- **Gigachad 67:** saltos durante la señal para romper el aura; coordinación simultánea en cooperativo.
- **Señor del Cubo Carmesí:** sello elevado y columnas de fuego. Usa una torre de cubitos en cooperativo o el resorte en individual.

Los ataques avisan antes de causar daño. Cuando cae el escudo, salta sobre el retrato: tres golpes abren la meta. La vida del jefe se comparte entre los jugadores. Morir dentro de una arena consume una vida y devuelve a su entrada. Visitar una casa después de vencer al jefe nunca cuenta como terminar un mundo.

## Arte y fluidez

Los fondos pintados de los cuatro mundos, las criaturas con transparencia, los iconos de equipo y los vecinos ilustrados son recursos locales originales generados para el juego. Los retratos de los jefes se adaptaron de las referencias del usuario. No se requieren servidores de imágenes ni fuentes externas.

El renderizador usa `requestAnimationFrame`, paralaje, texturas reutilizadas, descarte de elementos fuera de cámara, un máximo de 120 partículas y resolución limitada a DPR 2. Los retratos de jefes y los habitantes se cargan al necesitarlos. Las imágenes usan validación HTTP con ETag. El movimiento reducido desactiva efectos decorativos. Las animaciones visuales nunca cambian las colisiones.

La simulación compartida funciona a 60 Hz y envía estados a 30 Hz. El navegador predice sus entradas y vuelve a simular las pendientes tras cada confirmación. Los compañeros se interpolan sobre un reloj estable con margen adaptativo de aproximadamente 67–150 ms. Las pequeñas correcciones se suavizan; los cambios de zona y reapariciones se aplican directamente.

El servidor acepta intenciones, nunca coordenadas, premios o daño enviado por el cliente. Consume como máximo una entrada por jugador y paso, descarta retraso acumulado y conserva pulsaciones breves de salto e interacción. Los estados se serializan una vez por sala y se omiten para sockets saturados. La fluidez final depende del dispositivo y la conexión.

## Desarrollo y validación

Requiere Node.js 22 o superior y npm.

```sh
npm ci
npm test
npm start
```

El servidor escucha en `0.0.0.0:3000`; `PORT` y `HOST` son opcionales. `npm run dev` reinicia al editar archivos. No necesita claves, cuentas ni base de datos.

Las pruebas comprueban recorridos individuales y cooperativos hasta los castillos con entradas legales y tres vidas; física, apilamiento, paredes, hielo, barreras y enemigos; activación y daño de jefes; casas, conversaciones, entradas y salidas; ascenso físico a caminos ocultos y buhardillas; conservación de vidas y puntos de control; predicción; ráfagas de red; aislamiento y límites de salas; WebSockets reales y recursos HTTP.

La revisión en navegador comprueba crear y unirse, moverse entre casas y exterior, conversar, controles táctiles, movimiento reducido y renderizado de los cuatro mundos. Las comprobaciones locales no equivalen a verificar el despliegue público.

## Publicación

`render.yaml` configura un servicio Node con instalación y pruebas antes de arrancar y comprobación `/health`. Requiere WebSockets persistentes y una sola instancia. En otro alojamiento, configura HTTPS/WSS y la actualización WebSocket del proxy.

Las salas viven en memoria: un despliegue o reinicio interrumpe las partidas. No hay cuentas, reconexión automática ni guardado permanente; vidas, conversaciones y archivos se conservan durante la partida del mundo. Las partidas individuales también requieren conexión. El plan gratuito de Render puede entrar en reposo y tardar más en la primera carga. La historia larga sigue pendiente.
