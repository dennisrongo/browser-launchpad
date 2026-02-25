#!/usr/bin/env node
/**
 * Test server for infrastructure regression testing
 * Serves the test HTML page on port 9876
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 9876;
const HTML_FILE = path.join(__dirname, 'test-infra-regression.html');

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(HTML_FILE, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading test page');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  console.log(`Infrastructure test server running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop');
});
