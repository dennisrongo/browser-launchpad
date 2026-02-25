const http = require('http');
const fs = require('fs');
const path = require('path');

// First, copy the test file to dist directory
const testFileSource = path.join(__dirname, 'test-regression-features-1-2-3.html');
const testFileDest = path.join(__dirname, 'dist', 'test-regression.html');

fs.copyFileSync(testFileSource, testFileDest);
console.log('✓ Copied test file to dist/test-regression.html');

const server = http.createServer((req, res) => {
  let filePath = req.url === '/' ? '/test-regression.html' : req.url;

  // Serve from dist directory
  const distPath = path.join(__dirname, 'dist', filePath);

  const ext = path.extname(filePath);
  let contentType = 'text/html';
  if (ext === '.js') contentType = 'text/javascript';
  else if (ext === '.css') contentType = 'text/css';

  fs.readFile(distPath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end('File not found: ' + filePath);
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`Regression Test Server`);
  console.log(`========================================`);
  console.log(`\nTest server running on http://localhost:${PORT}`);
  console.log(`\nIMPORTANT: To test Chrome Storage API properly:`);
  console.log(`1. Load this extension in Chrome Developer Mode`);
  console.log(`2. The extension directory is: ${path.join(__dirname, 'dist')}`);
  console.log(`3. Or, modify the test HTML to work with the existing extension context`);
  console.log(`\n========================================\n`);
});
