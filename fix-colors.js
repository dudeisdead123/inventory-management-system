const fs = require('fs');
const path = require('path');

const targetDirs = [
  'c:\\Users\\Asus\\Downloads\\Inventory-Management-System-MERN-CRUD-App-main\\frontend\\inventory_management_system\\src',
  'c:\\Users\\Asus\\Downloads\\Inventory-Management-System-MERN-CRUD-App-main\\frontend\\inventory_management_system\\src\\components'
];

const replacements = [
  { regex: /background-color:\s*#f8fafc\b/gi, replacement: 'background-color: var(--bg-dark)' },
  { regex: /background:\s*#f8fafc\b/gi, replacement: 'background: var(--bg-dark)' },
  { regex: /background-color:\s*#ffffff\b/gi, replacement: 'background-color: var(--bg-card)' },
  { regex: /background:\s*#ffffff\b/gi, replacement: 'background: var(--bg-card)' },
  { regex: /background-color:\s*white\b/gi, replacement: 'background-color: var(--bg-card)' },
  { regex: /background:\s*white\b/gi, replacement: 'background: var(--bg-card)' },
  { regex: /background:\s*#f8f9fa\b/gi, replacement: 'background: transparent' },
  { regex: /background-color:\s*#f8f9fa\b/gi, replacement: 'background-color: transparent' },
  { regex: /background:\s*#e9ecef\b/gi, replacement: 'background: var(--bg-card-hover)' },
  { regex: /background:\s*#f9f9f9\b/gi, replacement: 'background: var(--bg-card)' },
  { regex: /background:\s*#fff9e6\b/gi, replacement: 'background: rgba(255, 234, 0, 0.1)' }, 
  { regex: /background:\s*#ffebee\b/gi, replacement: 'background: rgba(255, 23, 68, 0.1)' },
  { regex: /color:\s*#0f172a\b/gi, replacement: 'color: var(--text-main)' },
  { regex: /color:\s*#64748b\b/gi, replacement: 'color: var(--text-muted)' },
  { regex: /color:\s*#1e293b\b/gi, replacement: 'color: var(--text-main)' },
  { regex: /color:\s*#334155\b/gi, replacement: 'color: var(--text-muted)' },
  { regex: /color:\s*#000000\b/gi, replacement: 'color: var(--text-main)' },
  { regex: /color:\s*black\b/gi, replacement: 'color: var(--text-main)' },
  { regex: /background:\s*#fff3cd\b/gi, replacement: 'background: rgba(255, 234, 0, 0.1)' },
  { regex: /background:\s*#d4edda\b/gi, replacement: 'background: rgba(0, 230, 118, 0.1)' },
  { regex: /background:\s*#f8d7da\b/gi, replacement: 'background: rgba(255, 23, 68, 0.1)' },
  { regex: /background:\s*#f5c6cb\b/gi, replacement: 'background: rgba(255, 23, 68, 0.2)' },
  { regex: /background:\s*#e3f2fd\b/gi, replacement: 'background: rgba(0, 242, 254, 0.1)' },
];

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) continue;
    
    if (fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      for (const { regex, replacement } of replacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log('Fixed', fullPath);
      }
    }
  }
}

targetDirs.forEach(processDir);
