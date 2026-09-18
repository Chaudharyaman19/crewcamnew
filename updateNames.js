const fs = require("fs");
const path = require("path");

const dir = "./src/screens/Main";
const files = fs.readdirSync(dir);

let updated = 0;
files.forEach(file => {
  if (file.endsWith(".tsx") && file !== "ProfileScreen.tsx") { // ProfileScreen already manually fixed
    let content = fs.readFileSync(path.join(dir, file), "utf-8");
    let original = content;

    content = content.replace(
      /\{\s*(?:userName|empFirstName|userData\.firstname|UserName)\s*\?\s*\(\s*(?:userName|empFirstName|userData\.firstname|UserName)\.match\(\/\^.*?\/\w*\)\s*\|\|\s*\[''\]\)\[\d+\]\.split\('.*?'\)\.map\(.*?\)\.join\('.*?'\)\s*:\s*.User.\s*\}/gs,
      "{formatName(userData.firstname)}"
    );
    
    content = content.replace(
      /\{\s*(?:userData\.firstname|UserName|userName|empFirstName)\s*\?\s*(?:userData\.firstname|UserName|userName|empFirstName)\.split\('.*?'\)\[0\]\.charAt\(0\)\.toUpperCase\(\)\s*\+\s*(?:userData\.firstname|UserName|userName|empFirstName)\.split\('.*?'\)\[0\]\.slice\(1\)\.toLowerCase\(\)\s*:\s*.User.\s*\}/gs,
      "{formatName(userData.firstname)}"
    );

    content = content.replace(
      /\{\s*userName\s*\?\s*userName\.split\('.*?'\)\.slice\(.*?\)\.map\(.*?\)\.join\('.*?'\)\s*:\s*.User.\s*\}/gs,
      "{formatName(userData.firstname)}"
    );

    if (content !== original) {
      if (!content.includes("import { formatName }")) {
        const lastImport = content.lastIndexOf("import ");
        if (lastImport !== -1) {
          const endOfImport = content.indexOf(";", lastImport);
          // Insert after the semicolon
          content = content.slice(0, endOfImport + 1) + "\nimport { formatName } from '../../utils/formatName';" + content.slice(endOfImport + 1);
        } else {
          content = "import { formatName } from '../../utils/formatName';\n" + content;
        }
      }
      fs.writeFileSync(path.join(dir, file), content, "utf-8");
      console.log("Updated", file);
      updated++;
    }
  }
});
console.log("Total Updated:", updated);
