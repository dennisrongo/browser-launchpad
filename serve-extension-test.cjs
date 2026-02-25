import { createServer } from 'http';
import { parse } from 'url';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const __dirname = resolve();

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
};

const server = createServer((req, res) => {
  const pathname = parse(req.url).pathname;
  let filePath = resolve(__dirname, 'dist', pathname === '/' ? 'newtab.html' : pathname.slice(1));

  // Default to newtab.html for root
  if (pathname === '/') {
    filePath = resolve(__dirname, 'dist', 'newtab.html');
  }

  const ext = filePath.split('.').pop();
  const contentType = mimeTypes[`.${ext}`] || 'application/octet-stream';

  if (existsSync(filePath)) {
    const content = readFileSync(filePath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
    console.log(`200 ${pathname}`);
  } else {
    res.writeHead(404);
    res.end('Not Found');
    console.log(`404 ${pathname}`);
  }
});

const PORT = 8765;
server.listen(PORT, () => {
  console.log(`Extension test server running at http://localhost:${PORT}`);
  console.log('Serving production build from dist/');
  console.log();
  console.log('Test URL: http://localhost:8765');
  console.log('Press Ctrl+C to stop');
});
