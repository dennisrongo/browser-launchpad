const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8768;
const FILE = 'test-error-handling-146-147-148.html';

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
  console.log(`\n========================================`);
  console.log(`Error Handling Test Server running at:`);
  console.log(`http://localhost:${PORT}`);
  console.log(`========================================\n`);
  console.log(`Testing Features #146, #147, #148`);
  console.log(`Press Ctrl+C to stop\n`);
});
