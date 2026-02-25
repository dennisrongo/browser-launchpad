const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8084;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(fs.readFileSync(path.join(__dirname, 'test-extension-init-16.html')));
  } else if (req.url === '/dist/newtab.html') {
    const content = fs.readFileSync('dist/newtab.html', 'utf-8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(content);
  } else if (req.url === '/dist/newtab.js') {
    const content = fs.readFileSync('dist/newtab.js');
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(content);
  } else if (req.url === '/dist/newtab.css') {
    const content = fs.readFileSync('dist/newtab.css');
    res.writeHead(200, { 'Content-Type': 'text/css' });
    res.end(content);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log('Open this URL in your browser to test Feature #16');
});
