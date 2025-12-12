#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all agent files
const agentFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.md') && !f.startsWith('AGENT_') && !f.startsWith('README'))
  .sort();

const categories = {};

for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Extract category from frontmatter
  const match = content.match(/\ncategory:\s*(\S+)/);
  if (match) {
    const category = match[1];
    categories[category] = (categories[category] || 0) + 1;
  }
}

console.log('\n📊 Agent Count by Category:\n');
const sortedCategories = Object.entries(categories).sort((a, b) => b[1] - a[1]);

for (const [category, count] of sortedCategories) {
  console.log(`${category.padEnd(20)}: ${count} agents`);
}

console.log(`\n${'TOTAL'.padEnd(20)}: ${agentFiles.length} agents`);
