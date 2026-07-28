const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8083;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.otf': 'font/otf',
  '.ttf': 'font/ttf'
};

const server = http.createServer((req, res) => {
  // Handle save template POST API
  if (req.method === 'POST' && req.url === '/api/save-template') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const { tplKey, overrides } = JSON.parse(body);
        const overridesPath = path.join(__dirname, 'overrides.json');
        
        let existing = {};
        if (fs.existsSync(overridesPath)) {
          existing = JSON.parse(fs.readFileSync(overridesPath, 'utf8') || '{}');
        }
        
        existing[tplKey] = overrides;
        
        fs.writeFileSync(overridesPath, JSON.stringify(existing, null, 2), 'utf8');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Serve static files
  const pathname = new URL(req.url, `http://${req.headers.host || 'localhost'}`).pathname;
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(__dirname, filePath);
  
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': mime });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
