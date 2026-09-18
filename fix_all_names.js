const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/screens/Main');
const vars = ['userName', 'UserName', 'empName', 'userData.firstname', 'empFirstName', 'username'];

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      for (const v of vars) {
        // Regex to find {var} or {var || "fallback"} inside JSX (so we avoid imports/logic).
        // A simple heuristic is that it shouldn't be preceded by `? ` or `.` and should have `{ `
        const escapedVar = v.replace('.', '\\.');
        const regex = new RegExp(`\\{\\s*${escapedVar}\\s*(?:\\|\\|\\s*['"][^'"]*['"]\\s*)?\\}`, 'g');
        
        content = content.replace(regex, (match, offset, fullText) => {
          // If it's already part of our split logic, ignore
          const previousChars = fullText.substring(Math.max(0, offset - 20), offset);
          if (previousChars.includes('? ') || previousChars.includes('Hi,')) {
            // we already replaced those or it's part of the replacement we just injected
            return match;
          }
          
          changed = true;
          return `{\n              ${v}\n                ? ${v}.split(' ')[0].charAt(0).toUpperCase() +\n                  ${v}.split(' ')[0].slice(1).toLowerCase()\n                : 'User'\n            }`;
        });
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${file}`);
      }
    }
  }
}

processDir(dir);
