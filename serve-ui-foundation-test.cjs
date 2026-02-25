#!/usr/bin/env node

/**
 * Test server for UI Foundation features #18, #20, #24
 * Verifies the app loads in a browser without console errors
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8766;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

const server = http.createServer((req, res) => {
  let filePath = '.' + req.url;
  if (filePath === './') {
    filePath = './dist/newtab.html';
  }

  const extname = String(path.extname(filePath)).toLowerCase();
  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 Not Found</h1>', 'utf-8');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${error.code}`, 'utf-8');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`\nUI Foundation Test Server running at http://localhost:${PORT}/`);
  console.log('\nTo verify Feature #24 (App loads without errors):');
  console.log('1. Open http://localhost:8765/ in a browser');
  console.log('2. Open Chrome DevTools (F12)');
  console.log('3. Check the Console tab for errors');
  console.log('4. Verify the dashboard renders with no console errors\n');
  console.log('Press Ctrl+C to stop the server\n');
});
