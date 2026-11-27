import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const host = process.env.YUNATT_PROBE_HOST ?? '10.21.74.112';
const port = Number(process.env.YUNATT_PROBE_PORT ?? 7005);
const logPath = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  'yunatt-probe.log',
);

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const entry = {
      at: new Date().toISOString(),
      remote: req.socket.remoteAddress,
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: Buffer.concat(chunks).toString('utf8'),
    };
    const line = JSON.stringify(entry);
    fs.appendFileSync(logPath, `${line}\n`);
    console.log(line);
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('OK');
  });
});

server.on('connection', (socket) => {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      event: 'tcp',
      remote: socket.remoteAddress,
    }),
  );
});

server.listen(port, host, () => {
  console.log(
    JSON.stringify({
      at: new Date().toISOString(),
      event: 'listen',
      host,
      port,
      logPath,
    }),
  );
});
