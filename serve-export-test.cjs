const express = require('express');
const path = require('path');

const app = express();
const PORT = 8766;

// Serve the built files
app.use(express.static(path.join(__dirname, 'dist')));

// Handle SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'newtab.html'));
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
