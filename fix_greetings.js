const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/screens/Main');

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;

      // Regex to find "Hi, {VARIABLE}" or "Hi, {VARIABLE || 'Fallback'}"
      // We will match: Hi, \s*(?:<Text[^>]*>)?\s*\{([^}]+)\}\s*(?:<\/Text>)?
      // But we can just do a more targeted replace for the specific lines.
      
      const regexList = [
        { regex: /Hi,\s*\{([a-zA-Z0-9_.]+)(?:\s*\|\|\s*['"][^'"]+['"])?\}/g, groupIndex: 1, textTag: false },
        { regex: /Hi,\s*<Text[^>]*>\s*\{([a-zA-Z0-9_.]+)(?:\s*\|\|\s*['"][^'"]+['"])?\}/g, groupIndex: 1, textTag: true },
        { regex: /\{\s*getGreeting\(\)\s*\}\s*\{\s*\(([a-zA-Z0-9_.]+)\s*\|\|\s*['"][^'"]*['"]\)\.replace[^}]+\}/g, groupIndex: 1, isProfile: true}
      ];

      for (const item of regexList) {
        content = content.replace(item.regex, (match, variable) => {
          changed = true;
          const varName = variable.trim();
          
          if (item.isProfile) {
            return `{getGreeting()} {\n              ${varName}\n                ? ${varName}.split(' ')[0].charAt(0).toUpperCase() +\n                  ${varName}.split(' ')[0].slice(1).toLowerCase()\n                : 'User'\n            }`;
          }
          
          const replacement = `{\n              ${varName}\n                ? ${varName}.split(' ')[0].charAt(0).toUpperCase() +\n                  ${varName}.split(' ')[0].slice(1).toLowerCase()\n                : 'User'\n            }`;
          
          if (item.textTag) {
            // we have <Text ...>{...}
            return match.replace(/\{([a-zA-Z0-9_.]+)(?:\s*\|\|\s*['"][^'"]+['"])?\}/, replacement);
          } else {
            return `Hi, ${replacement}`;
          }
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
