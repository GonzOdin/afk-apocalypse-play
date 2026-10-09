// Minimal signaling server for AFK Apocalypse. Speaks the same wire protocol
// the game already uses: connect to /peerjs?key=peerjs&id=XXX&token=YYY,
// get {"type":"OPEN"}, send {"type":"HEARTBEAT"} every 5s, and relay
// {"type":"OFFER"|"ANSWER"|"CANDIDATE","dst":id,"payload":{...}} to peers.
// Run: npm install && node server.js   (PORT env, default 9000)
const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 9000;
const HEARTBEAT_TIMEOUT = 60000; // drop clients silent this long

const clients = new Map(); // id -> { ws, lastHeartbeat }

function send(ws, obj) {
  if (ws.readyState === 1) ws.send(JSON.stringify(obj));
}

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain' });
  res.end('afk-apocalypse signal server ok\n');
});

const wss = new WebSocketServer({ server, path: '/peerjs' });

wss.on('connection', (ws, req) => {
  let id = '';
  try { id = new URL(req.url, 'http://x').searchParams.get('id') || ''; } catch (_) {}
  if (!id || clients.has(id)) {
    send(ws, { type: 'ID-TAKEN' });
    ws.close();
    return;
  }
  const rec = { ws, lastHeartbeat: Date.now() };
  clients.set(id, rec);
  console.log('OPEN', id, '(' + clients.size + ' connected)');
  send(ws, { type: 'OPEN' });

  ws.on('message', (raw) => {
    let m;
    try { m = JSON.parse(raw.toString()); } catch (_) { return; }
    if (!m || typeof m !== 'object') return;
    if (m.type === 'HEARTBEAT') { rec.lastHeartbeat = Date.now(); return; }
    const dst = m.dst;
    if ((m.type === 'OFFER' || m.type === 'ANSWER' || m.type === 'CANDIDATE') && typeof dst === 'string') {
      const d = clients.get(dst);
      if (d) send(d.ws, { type: m.type, src: id, dst, payload: m.payload });
      // unknown dst: dropped, like the reference server
    }
  });

  ws.on('close', () => {
    if (clients.get(id) === rec) clients.delete(id);
    console.log('CLOSE', id, '(' + clients.size + ' connected)');
  });
  ws.on('error', () => {});
});

// reap clients that stopped heartbeating
setInterval(() => {
  const now = Date.now();
  for (const [id, rec] of clients) {
    if (now - rec.lastHeartbeat > HEARTBEAT_TIMEOUT) {
      console.log('TIMEOUT', id);
      try { rec.ws.close(); } catch (_) {}
      clients.delete(id);
    }
  }
}, 15000);

server.listen(PORT, () => console.log('signal server on :' + PORT));
