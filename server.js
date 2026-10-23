import http from 'node:http';
import { readFile } from 'node:fs/promises';

const files = new Map([
  ['/', ['public/index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['public/style.css', 'text/css; charset=utf-8']],
]);

const server = http.createServer(async (req, res) => {
  let path;
  try {
    path = new URL(req.url, 'http://localhost').pathname;
  } catch {
    res.writeHead(400);
    return res.end();
  }
  const headers = { 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' };
  if (path === '/health') {
    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, version: '0.1.0' }));
  }
  const file = files.get(path);
  if (!file) {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end('No encontrado');
  }
  try {
    const data = await readFile(new URL(file[0], import.meta.url));
    res.writeHead(200, { ...headers, 'Content-Type': file[1] });
    res.end(data);
  } catch {
    res.writeHead(500, headers);
    res.end('Error al cargar la página');
  }
});

server.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0', () => {
  console.log(`Servidor escuchando en ${server.address().port}`);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
