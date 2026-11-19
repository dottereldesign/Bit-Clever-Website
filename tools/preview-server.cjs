// Dependency-free local preview. HTML, CSS and JS edits reload connected tabs.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const port = 4175;
const clients = new Set();
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2' };
const reload = `<script>(()=>{let connected=false;const events=new EventSource('/__preview/events');events.onopen=()=>{if(connected)location.reload();connected=true};events.onmessage=()=>location.reload();})();</script>`;
const server = http.createServer((req, res) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (pathname === '/__preview/noise-defaults') {
    const reply = (status, value) => {
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify(value));
    };
    if (req.method !== 'POST') { reply(405, {error: 'POST required'}); return; }
    if (req.headers.origin !== `http://127.0.0.1:${port}` && req.headers.origin !== `http://localhost:${port}`) {
      reply(403, {error: 'Save from the local preview only'}); return;
    }
    if (req.headers['content-type'] !== 'application/json') { reply(415, {error: 'JSON required'}); return; }
    let body = '';
    req.on('data', chunk => { body += chunk; if (body.length > 4096) req.destroy(); });
    req.on('end', () => {
      try {
        const {preset, strength, size} = JSON.parse(body);
        if (!Number.isInteger(preset) || preset < 0 || preset > 9 || !Number.isFinite(strength) || strength < 0 || strength > 4 || !Number.isFinite(size) || size < .25 || size > 4) {
          reply(400, {error: 'Invalid noise settings'}); return;
        }
        const settings = {preset, strength, size, revision: new Date().toISOString()};
        fs.writeFileSync(path.join(root, 'assets/noise-defaults.json'), JSON.stringify(settings, null, 2) + '\n');
        reply(200, settings);
      } catch { reply(400, {error: 'Unable to save noise settings'}); }
    });
    return;
  }
  if (pathname === '/__preview/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify({ app: 'bit-clever-preview', root }));
    return;
  }
  if (pathname === '/__preview/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  const filename = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  const relative = path.relative(root, filename);
  if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(/[\\/]/).some(part => part.startsWith('.'))) {
    res.writeHead(403).end(); return;
  }
  fs.readFile(filename, (error, data) => {
    if (error) { res.writeHead(404).end('Not found'); return; }
    const ext = path.extname(filename).toLowerCase();
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    if (req.method === 'HEAD') { res.end(); return; }
    res.end(ext === '.html' ? data.toString().replace('</body>', reload + '</body>') : data);
  });
});
let pending;
fs.watch(root, { recursive: true }, (event, name) => {
  if (!name || name.split(/[\\/]/).some(part => part.startsWith('.') || part === 'node_modules')) return;
  // The save button shows its own success state; do not erase it with a reload.
  if (name.replaceAll('\\', '/') === 'assets/noise-defaults.json') return;
  if (!/\.(html|css|js|json|svg|png|jpe?g|webp|woff2?)$/i.test(name)) return;
  clearTimeout(pending);
  pending = setTimeout(() => {
    for (const client of clients) client.write('data: reload\n\n');
  }, 120);
});
setInterval(() => { for (const client of clients) client.write(': heartbeat\n\n'); }, 15000).unref();
server.listen(port, '127.0.0.1', () => console.log(`Bit Clever preview: http://127.0.0.1:${port}`));
