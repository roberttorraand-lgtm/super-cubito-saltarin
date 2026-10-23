# Nuevo juego

Base mínima para empezar un nuevo juego. Contiene un servidor HTTP, una página provisional y la configuración de Render. No tiene dependencias externas ni mecánicas del juego anterior.

## Arrancar

Requiere Node.js 22 o superior.

```sh
npm ci
npm start
```

Abre http://localhost:3000. `npm run dev` reinicia el servidor al editar archivos. `PORT` y `HOST` son opcionales; `/health` comprueba el estado del servidor.

## Despliegue

`render.yaml` conserva el identificador del servicio existente para actualizar el mismo despliegue. La página provisional sustituye al juego anterior cuando Render despliega esta revisión.
