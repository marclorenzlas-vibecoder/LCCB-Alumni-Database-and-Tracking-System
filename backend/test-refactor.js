const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, 'src', 'routes');

fs.readdirSync(routesDir).forEach(file => {
  if (file.endsWith('.js')) {
    const filePath = path.join(routesDir, file);
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Replace instantiation with require
    content = content.replace(/const prisma = new PrismaClient\(\);?/g, "const prisma = require('../config/prisma');");
    
    // Remove PrismaClient from imports
    // Case 1: const { PrismaClient } = require('@prisma/client');
    content = content.replace(/const\s*{\s*PrismaClient\s*}\s*=\s*require\('@prisma\/client'\);?\s*\n?/g, '');
    
    // Case 2: const { PrismaClient, otherThing } = require('@prisma/client');
    // We want to just remove PrismaClient from the list
    content = content.replace(/PrismaClient\s*,\s*/g, '');
    content = content.replace(/,\s*PrismaClient/g, '');

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Refactored ${file}`);
  }
});
console.log('Done refactoring');
