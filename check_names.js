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
      
      // Look for occurrences of these variables inside curly braces
      for (const v of vars) {
        // Match {v} or {v || "something"}
        const regex = new RegExp(`\\{\\s*${v.replace('.', '\\.')}\\s*(?:\\|\\|\\s*['"][^'"]*['"]\\s*)?\\}`, 'g');
        let match;
        while ((match = regex.exec(content)) !== null) {
          // If the match is not preceded by split(' ')[0] or similar
          console.log(`Found in ${file}: ${match[0]}`);
        }
      }
    }
  }
}

processDir(dir);
