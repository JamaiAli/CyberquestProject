const fs = require('fs');
const path = require('path');

const dir = 'c:/CyberquestProject/frontend/src/components';

function replaceColors(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let newContent = content
    .replace(/#00ff41/gi, '#00f0ff') // Green -> Neon Blue (Cyan)
    .replace(/#ff0000/gi, '#ff007f') // Red -> Neon Pink
    .replace(/#0a1f0a/gi, '#001a1a') // Dark green bg -> Dark blue bg
    .replace(/#11331c/gi, '#1a1a3a') // Dark green border -> Dark blue border
    .replace(/#00aa2b/gi, '#00a0dd'); // Dim green -> Dim blue

  if (content !== newContent) {
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function traverse(currentDir) {
  const files = fs.readdirSync(currentDir);
  for (const file of files) {
    const fullPath = path.join(currentDir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      traverse(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceColors(fullPath);
    }
  }
}

traverse(dir);
// Also apply to App.jsx and main.css just in case
replaceColors('c:/CyberquestProject/frontend/src/App.jsx');
