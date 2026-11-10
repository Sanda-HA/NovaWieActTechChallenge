import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const live = process.argv.includes('--live');
const previewPort = Number(process.env.EDNOVA_PREVIEW_PORT ?? 4173);
const backendPort = Number(process.env.EDNOVA_BACKEND_PORT ?? 9999);
if (![previewPort, backendPort].every(port => Number.isInteger(port) && port > 0 && port <= 65535)) {
  throw new Error('EdNova ports must be integers between 1 and 65535.');
}
const types = {'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.ttf':'font/ttf','.jpg':'image/jpeg','.png':'image/png'};
const routes = {
  GET: /^\/(auth\/me|learning\/(diagnostic|progress)|topics|me\/profile|study\/summary|groups\/rooms(?:\/[a-f0-9-]{36})?)$/,
  POST: /^\/(auth\/(register|login)|learning\/diagnostic|study\/(start|stop)|groups\/(demo\/check|rooms(?:\/join|\/[a-f0-9-]{36}\/check)?)|tutor\/(sessions|feedback|sessions\/[a-f0-9-]{36}\/messages))$/,
  PUT: /^\/me\/profile$/,
  DELETE: /^\/(auth\/me|groups\/rooms\/[a-f0-9-]{36})$/,
};
const liveFiles = new Set(['live.html','src/live.mjs','src/api.mjs','src/i18n.mjs','src/locale-en.mjs','src/live-screens.mjs','src/live-rooms.mjs','src/onboarding-preferences.mjs','src/live-tutor.mjs','src/live-tutor.css','src/tutor-workspace.mjs','src/components.js','src/components.css','src/onboarding.js','reference/onboarding.css']);

function proxy(req, res, endpoint) {
  const headers = {};
  for (const name of ['authorization','accept','content-type','content-length']) {
    if (req.headers[name]) headers[name] = req.headers[name];
  }
  const upstream = http.request({hostname:'127.0.0.1',port:backendPort,path:endpoint,method:req.method,headers}, response => {
    const output = {'cache-control':'no-store'};
    for (const name of ['content-type','retry-after']) {
      if (response.headers[name]) output[name] = response.headers[name];
    }
    res.writeHead(response.statusCode, output);
    response.pipe(res);
  });
  upstream.setTimeout(65000, () => upstream.destroy(new Error('Backend timeout')));
  upstream.on('error', () => {
    if (res.headersSent) return res.destroy();
    res.writeHead(503, {'content-type':'application/json','cache-control':'no-store'})
      .end(JSON.stringify({detail:{error:'backend_unavailable'}}));
  });
  res.on('close', () => upstream.destroy());
  req.pipe(upstream);
}

http.createServer((req,res) => {
  let requested;
  try { requested = decodeURIComponent(new URL(req.url,'http://localhost').pathname); }
  catch { res.writeHead(400).end(); return; }
  if (requested.startsWith('/api/')) {
    const endpoint = requested.slice(4);
    if (live && routes[req.method]?.test(endpoint)) return proxy(req, res, endpoint);
    res.writeHead(404).end(); return;
  }
  const file = path.resolve(root,'.' + (requested === '/' && live ? '/live.html' : requested.endsWith('/') ? requested + 'index.html' : requested));
  const relative = path.relative(root,file).split(path.sep).join('/');
  const group = relative.split('/')[0];
  const allowed = live ? liveFiles.has(relative) || group === 'vendor'
    : ['src','vendor','reference','evidence'].includes(group) || ['index.html','review.html'].includes(relative);
  if (!file.startsWith(root+path.sep) || !allowed) { res.writeHead(404).end(); return; }
  fs.readFile(file,(err,body) => {
    if (err) { res.writeHead(404).end(); return; }
    res.writeHead(200, {'Content-Type':types[path.extname(file)]||'text/plain','Cache-Control':'no-store',
      'Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src " + (live ? "'self'" : "'none'")});
    res.end(body);
  });
}).listen(previewPort,'127.0.0.1',() => console.log('EdNova: http://127.0.0.1:' + previewPort + '/' + (live ? 'live.html' : 'index.html')));
