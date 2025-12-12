#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Get all agent files
const agentFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.md') && !f.startsWith('AGENT_') && !f.startsWith('README'))
  .sort();

console.log(`\n📊 Found ${agentFiles.length} agent files\n`);

const issues = [];
const agents = [];

for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');

  // Check for frontmatter
  const hasFrontmatter = content.startsWith('---\n');

  if (!hasFrontmatter) {
    issues.push(`❌ ${file} - Missing frontmatter`);
    continue;
  }

  // Extract frontmatter
  const endOfFrontmatter = content.indexOf('\n---', 4);
  if (endOfFrontmatter === -1) {
    issues.push(`❌ ${file} - Malformed frontmatter (no closing ---)`);
    continue;
  }

  const frontmatter = content.substring(4, endOfFrontmatter);

  // Parse frontmatter fields (including YAML lists)
  const fields = {};
  const lines = frontmatter.split('\n');
  let currentKey = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^([^:]+):\s*(.*)$/);

    if (match) {
      const key = match[1].trim();
      const value = match[2].trim();

      if (value) {
        fields[key] = value;
      } else {
        // Empty value, might be a list
        currentKey = key;
        fields[key] = [];
      }
    } else if (currentKey && line.trim().startsWith('-')) {
      // List item
      if (Array.isArray(fields[currentKey])) {
        fields[currentKey].push(line.trim().substring(1).trim());
      }
    }
  }

  // Convert arrays to indicator that field exists
  Object.keys(fields).forEach(key => {
    if (Array.isArray(fields[key]) && fields[key].length > 0) {
      fields[key] = fields[key]; // Keep the array
    } else if (Array.isArray(fields[key])) {
      delete fields[key]; // Empty array = missing field
    }
  });

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'author', 'capabilities'];
  const missingFields = requiredFields.filter(f => !fields[f]);

  if (missingFields.length > 0) {
    issues.push(`⚠️  ${file} - Missing fields: ${missingFields.join(', ')}`);
  }

  // Extract agent name from filename
  const agentName = file.replace('.md', '');

  agents.push({
    file,
    name: fields.name || agentName,
    version: fields.version,
    description: fields.description,
    valid: missingFields.length === 0
  });

  if (missingFields.length === 0) {
    console.log(`✅ ${file}`);
  }
}

if (issues.length > 0) {
  console.log('\n\n🚨 ISSUES FOUND:\n');
  issues.forEach(issue => console.log(issue));
}

console.log(`\n\n📈 SUMMARY:`);
console.log(`Total agents: ${agents.length}`);
console.log(`Valid agents: ${agents.filter(a => a.valid).length}`);
console.log(`Agents with issues: ${agents.filter(a => !a.valid).length}`);

// List all agent names for registry comparison
console.log(`\n\n📋 AGENT LIST FOR REGISTRY:`);
agents.forEach(a => {
  const filename = a.file.replace('.md', '');
  console.log(`  - ${filename}`);
});
