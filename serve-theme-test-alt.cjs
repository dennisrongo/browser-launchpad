const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9876;
const TEST_FILE = path.join(__dirname, 'test-theme-features-125-126-127.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/test') {
    console.log('Serving test file...');
    const html = fs.readFileSync(TEST_FILE, 'utf8');
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  } else if (req.url.startsWith('/dist/')) {
    const filePath = path.join(__dirname, req.url);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath);
      const ext = path.extname(filePath);
      const contentType = ext === '.css' ? 'text/css' : 'application/javascript';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`\nTheme Features Test Server running at http://localhost:${PORT}/test`);
  console.log('Testing features #125, #126, #127');
  console.log('\nPress Ctrl+C to stop\n');
});
