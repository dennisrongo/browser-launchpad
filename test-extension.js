// Simple test to verify Chrome extension structure
const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');

console.log('=== Chrome Extension Structure Test ===\n');

// Check manifest.json
console.log('1. Checking manifest.json...');
const manifestPath = path.join(distPath, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log('   ✓ manifest.json exists');
  console.log('   - Name:', manifest.name);
  console.log('   - Version:', manifest.version);
  console.log('   - Permissions:', manifest.permissions);
  if (manifest.permissions.includes('storage')) {
    console.log('   ✓ Storage permission granted');
  } else {
    console.log('   ✗ Storage permission MISSING');
  }
} else {
  console.log('   ✗ manifest.json not found');
}

// Check newtab.html
console.log('\n2. Checking newtab.html...');
const newtabPath = path.join(distPath, 'newtab.html');
if (fs.existsSync(newtabPath)) {
  const newtab = fs.readFileSync(newtabPath, 'utf8');
  console.log('   ✓ newtab.html exists');
  if (newtab.includes('newtab.js')) {
    console.log('   ✓ newtab.js is referenced');
  } else {
    console.log('   ✗ newtab.js is NOT referenced');
  }
} else {
  console.log('   ✗ newtab.html not found');
}

// Check newtab.js
console.log('\n3. Checking newtab.js...');
const jsPath = path.join(distPath, 'newtab.js');
if (fs.existsSync(jsPath)) {
  const js = fs.readFileSync(jsPath, 'utf8');
  console.log('   ✓ newtab.js exists (' + (js.length / 1024).toFixed(2) + ' KB)');
  if (js.includes('chrome.storage')) {
    console.log('   ✓ chrome.storage API is used');
  } else {
    console.log('   ✗ chrome.storage API NOT found');
  }
  if (js.includes('verifyStorageConnection')) {
    console.log('   ✓ Storage verification function exists');
  } else {
    console.log('   ✗ Storage verification function NOT found');
  }
} else {
  console.log('   ✗ newtab.js not found');
}

// Check icons
console.log('\n4. Checking icons...');
['icon16.png', 'icon48.png', 'icon128.png'].forEach(icon => {
  const iconPath = path.join(distPath, icon);
  if (fs.existsSync(iconPath)) {
    console.log('   ✓', icon, 'exists');
  } else {
    console.log('   ✗', icon, 'MISSING');
  }
});

console.log('\n=== Test Complete ===');
