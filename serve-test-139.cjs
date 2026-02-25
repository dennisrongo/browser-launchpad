const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8139;
const TEST_FILE = 'test-feature-139-import-success.html';

const server = http.createServer((req, res) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);

  if (req.url === '/' || req.url === `/${TEST_FILE}`) {
    fs.readFile(path.join(__dirname, TEST_FILE), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/dist/newtab.html') {
    fs.readFile(path.join(__dirname, 'dist', 'newtab.html'), (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url.startsWith('/dist/')) {
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('File not found');
        return;
      }
      const ext = path.extname(req.url);
      const contentType = ext === '.css' ? 'text/css' :
                          ext === '.js' ? 'application/javascript' :
                          'text/plain';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Feature #139 Test Server Running`);
  console.log(`========================================`);
  console.log(`Test Page:  http://localhost:${PORT}/${TEST_FILE}`);
  console.log(`App:        http://localhost:${PORT}/dist/newtab.html`);
  console.log(`========================================\n`);
  console.log(`Press Ctrl+C to stop the server\n`);
});
