#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🏥 Agent System Health Check\n');
console.log('═'.repeat(60));

let hasErrors = false;
let hasWarnings = false;

// 1. Check agent files
console.log('\n📁 Checking agent files...');
const agentFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.md') && !f.startsWith('AGENT_') && !f.startsWith('README'))
  .sort();

console.log(`   ✅ Found ${agentFiles.length} agent files`);

// 2. Validate frontmatter
console.log('\n📋 Validating frontmatter...');
const requiredFields = ['name', 'version', 'category', 'description', 'author', 'capabilities'];
let validAgents = 0;
let invalidAgents = [];

for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const agentName = file.replace('.md', '');

  if (!content.startsWith('---\n')) {
    invalidAgents.push(`${file}: Missing frontmatter`);
    continue;
  }

  const endOfFrontmatter = content.indexOf('\n---', 4);
  if (endOfFrontmatter === -1) {
    invalidAgents.push(`${file}: Malformed frontmatter`);
    continue;
  }

  const frontmatter = content.substring(4, endOfFrontmatter);
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
        currentKey = key;
        fields[key] = [];
      }
    } else if (currentKey && line.trim().startsWith('-')) {
      if (Array.isArray(fields[currentKey])) {
        fields[currentKey].push(line.trim().substring(1).trim());
      }
    }
  }

  Object.keys(fields).forEach(key => {
    if (Array.isArray(fields[key]) && fields[key].length === 0) {
      delete fields[key];
    }
  });

  const missingFields = requiredFields.filter(f => !fields[f]);

  if (missingFields.length === 0) {
    validAgents++;
  } else {
    invalidAgents.push(`${file}: Missing ${missingFields.join(', ')}`);
  }

  // Check name matches filename
  if (fields.name && fields.name !== agentName) {
    hasWarnings = true;
    console.log(`   ⚠️  ${file}: Name mismatch (frontmatter: ${fields.name}, filename: ${agentName})`);
  }
}

if (invalidAgents.length === 0) {
  console.log(`   ✅ All ${validAgents} agents have valid frontmatter`);
} else {
  hasErrors = true;
  console.log(`   ❌ ${invalidAgents.length} agents have invalid frontmatter:`);
  invalidAgents.forEach(msg => console.log(`      - ${msg}`));
}

// 3. Check registry
console.log('\n📚 Checking registry...');
const registryPath = path.join(__dirname, 'AGENT_CAPABILITY_REGISTRY.md');
if (fs.existsSync(registryPath)) {
  const registryContent = fs.readFileSync(registryPath, 'utf8');
  const totalMatch = registryContent.match(/\*\*Total Agents\*\*:\s*(\d+)/);

  if (totalMatch) {
    const registryCount = parseInt(totalMatch[1]);
    if (registryCount === agentFiles.length) {
      console.log(`   ✅ Registry count matches (${registryCount} agents)`);
    } else {
      hasErrors = true;
      console.log(`   ❌ Registry count mismatch: registry says ${registryCount}, found ${agentFiles.length} files`);
    }
  } else {
    hasWarnings = true;
    console.log(`   ⚠️  Could not parse agent count from registry`);
  }
} else {
  hasErrors = true;
  console.log(`   ❌ Registry file not found`);
}

// 4. Check framework
console.log('\n🏗️  Checking framework...');
const frameworkPath = path.join(__dirname, 'AGENT_FRAMEWORK.md');
if (fs.existsSync(frameworkPath)) {
  console.log(`   ✅ Framework file exists`);
} else {
  hasWarnings = true;
  console.log(`   ⚠️  Framework file not found`);
}

// 5. Check for duplicate agents
console.log('\n🔍 Checking for duplicates...');
const names = new Set();
const duplicates = [];

for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const nameMatch = content.match(/\nname:\s*(\S+)/);

  if (nameMatch) {
    const name = nameMatch[1];
    if (names.has(name)) {
      duplicates.push(name);
    }
    names.add(name);
  }
}

if (duplicates.length === 0) {
  console.log(`   ✅ No duplicate agent names found`);
} else {
  hasErrors = true;
  console.log(`   ❌ Duplicate agent names: ${duplicates.join(', ')}`);
}

// 6. Category validation
console.log('\n🏷️  Validating categories...');
const validCategories = [
  'orchestration', 'development', 'security', 'intelligence',
  'operations', 'infrastructure', 'monitoring', 'research',
  'data', 'integration', 'quality', 'documentation', 'general'
];

const invalidCategories = [];
for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const categoryMatch = content.match(/\ncategory:\s*(\S+)/);

  if (categoryMatch) {
    const category = categoryMatch[1];
    if (!validCategories.includes(category)) {
      invalidCategories.push(`${file}: ${category}`);
    }
  }
}

if (invalidCategories.length === 0) {
  console.log(`   ✅ All categories are valid`);
} else {
  hasWarnings = true;
  console.log(`   ⚠️  Invalid categories found:`);
  invalidCategories.forEach(msg => console.log(`      - ${msg}`));
}

// Summary
console.log('\n' + '═'.repeat(60));
console.log('\n📊 Health Check Summary:');
console.log(`   Total agents: ${agentFiles.length}`);
console.log(`   Valid agents: ${validAgents}`);
console.log(`   Invalid agents: ${invalidAgents.length}`);

if (!hasErrors && !hasWarnings) {
  console.log('\n✅ All checks passed! Agent system is healthy.\n');
  process.exit(0);
} else if (hasErrors) {
  console.log('\n❌ Critical errors found! Please fix the issues above.\n');
  process.exit(1);
} else {
  console.log('\n⚠️  Warnings found, but system is operational.\n');
  process.exit(0);
}
