const fs = require('fs');

const filePath = './src/components/SettingsModal.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Fix the theme click handlers to apply theme immediately
content = content.replace(
  /onClick=\{\(\) => setTheme\('modern-light'\)\}/g,
  "onClick={() => { setTheme('modern-light'); applyThemeToDocument('modern-light'); }}"
);

content = content.replace(
  /onClick=\{\(\) => setTheme\('dark-elegance'\)\}/g,
  "onClick={() => { setTheme('dark-elegance'); applyThemeToDocument('dark-elegance'); }}"
);

fs.writeFileSync(filePath, content);
console.log('Updated theme click handlers to apply theme immediately');
