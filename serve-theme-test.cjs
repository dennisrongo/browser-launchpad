const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9877;
const ROOT_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');

  let filePath = path.join(ROOT_DIR, req.url === '/' ? 'test-theme-features-122-123-124.html' : req.url);

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end('Server Error: ' + error.code, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Theme test server running at http://localhost:${PORT}/`);
  console.log(`Open http://localhost:${PORT}/test-theme-features-122-123-124.html in your browser`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server closed');
  });
});
