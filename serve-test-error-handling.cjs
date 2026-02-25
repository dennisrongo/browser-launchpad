const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8768;
const FILE = 'test-error-handling-149.html';

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, FILE)));
  } else if (req.url === '/newtab.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(fs.readFileSync(path.join(__dirname, 'dist', 'newtab.js')));
  } else if (req.url === '/newtab.css') {
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(fs.readFileSync(path.join(__dirname, 'dist', 'newtab.css')));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Testing Feature #149: User-friendly error messages`);
});
