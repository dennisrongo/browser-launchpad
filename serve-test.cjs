const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 7777;

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/newtab.html' : req.url;
  const distPath = path.join(__dirname, 'dist', filePath);

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';

  fs.readFile(distPath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
});
