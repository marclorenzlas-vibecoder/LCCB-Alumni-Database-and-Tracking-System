const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'AlumniChatPanel.jsx');
let content = fs.readFileSync(filePath, 'utf8');

const target = `    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, 240);`;

const replacement = `    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      setSearch('');
      closeTimerRef.current = null;
    }, 240);`;

content = content.replace(target, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed chat panel');
