const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/newtab.html' : req.url;

  // First try dist, then fall back to root
  const distPath = path.join(__dirname, 'dist', filePath);
  const rootPath = path.join(__dirname, filePath);

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';

  fs.readFile(distPath, (err, content) => {
    if (err) {
      // Try root path
      fs.readFile(rootPath, (err2, content2) => {
        if (err2) {
          res.writeHead(404);
          res.end('File not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content2);
      });
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const PORT = 9999;
server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
