# Turno Cero · Prototipo 0.3

Primera versión jugable de Turno Cero: Brasa Burger. Prototipo gratuito para Windows 10/11 de 64 bits.

Extrae toda la carpeta del ZIP y abre `TurnoCero.exe`. El ejecutable necesita los archivos que lo acompañan. No requiere instalar Node.js, Electron ni abrir un navegador.

- Turno de 23:00 a 07:00: 16 minutos reales, con 2 de preparación.
- Individual sin conexión; cooperativo online para 2–4 guardias mediante código de sala. El ordenador del anfitrión simula la partida; mapa y modelos están en cada instalación.
- Cuatro animatrónicos originales, teléfono con seis cámaras y batería, puertas blindadas con reservas independientes, escondites y latas para distraer.
- Conexión directa WebRTC cuando la red lo permite y enlace de apoyo en redes restringidas. Al salir el anfitrión termina la partida.
- Calidad automática, perfil ligero, geometría agrupada y contador opcional de FPS.
- Guardado local desde ESC. En cooperativo guarda el anfitrión; para continuar crea una nueva sala desde ese guardado.

Controles: WASD moverse, ratón mirar, Mayús correr, C agacharse, E interactuar, F linterna, Tab teléfono, G lanzar lata, Esc menú.

Es un prototipo, con modelos, animaciones y sonido provisionales. No incluye varias noches, instalador ni firma de código. La generación del paquete no sustituye las pruebas en un PC Windows real.

La ruta de apoyo se ha probado con clientes reales. La ruta directa aún requiere validación en una red sin la política de bloqueo UDP del entorno de pruebas. No se garantiza una tasa de FPS en todos los equipos.
