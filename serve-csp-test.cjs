const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8769;
const DIST_DIR = path.join(__dirname, 'dist');

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = http.createServer((req, res) => {
  let filePath = path.join(DIST_DIR, req.url === '/' ? 'newtab.html' : req.url);

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }

    // Add CSP headers for testing
    if (ext === '.html') {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; object-src 'self'; style-src 'self' 'unsafe-inline';");
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`CSP Test Server running at http://localhost:${PORT}`);
  console.log('Open this URL in Chrome to test CSP compliance');
  console.log('Check console for any CSP violations');
});
