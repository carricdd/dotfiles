#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Category mapping
const categoryMap = {
  'orchestrator-prime': 'orchestration',
  'pattern-recognition-agent': 'intelligence',
  'continuous-improvement-agent': 'intelligence',
  'agent-health-monitor': 'monitoring',
  'memory-persistence-agent': 'infrastructure',
  'observability-agent': 'monitoring',
  'playbook-intelligence-orchestrator': 'intelligence',
  'indydevdan': 'orchestration',
  'knowledge-graph-agent': 'intelligence',
  'mcp-protocol-manager': 'infrastructure',
  'trust-security-agent': 'security',
  'mesh-intelligence-orchestrator': 'infrastructure',
  'mesh-discovery-coordinator': 'infrastructure',
  'resource-cluster-manager': 'infrastructure',
  'distributed-load-balancer': 'infrastructure',
  'content-orchestrator': 'integration',
  'database-orchestrator': 'infrastructure',
  'backend-dev': 'development',
  'frontend-dev': 'development',
  'fullstack-dev': 'development',
  'microservices-dev': 'development',
  'ai-engineer': 'development',
  'websocket-engineer': 'development',
  'api-designer': 'development',
  'mcp-developer': 'development',
  'ui-designer': 'development',
  'devops-sre-agent': 'operations',
  'kubernetes-specialist': 'operations',
  'platform-engineer': 'operations',
  'finops-agent': 'operations',
  'security-engineer': 'security',
  'penetration-tester': 'security',
  'compliance-automation-agent': 'security',
  'security-frameworks': 'security',
  'incident-response-agent': 'security',
  'data-pipeline-agent': 'data',
  'data-scientist': 'data',
  'qa-automation-agent': 'quality',
  'technical-writer-agent': 'documentation',
  'research-analyst': 'intelligence',
  'trend-analyst': 'intelligence',
  'executive-assistant-ai': 'intelligence',
  'strategic-advisor-agent': 'intelligence',
  'customer-success-agent': 'intelligence',
  'project-orchestrator': 'orchestration',
  'microsoft-google-integration-research-2025': 'research',
  'cross_platform_deployment_research_2025': 'research'
};

// Get all agent files
const agentFiles = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.md') && !f.startsWith('AGENT_') && !f.startsWith('README'))
  .sort();

console.log(`\n🔧 Processing ${agentFiles.length} agent files...\n`);

let fixed = 0;
let skipped = 0;

for (const file of agentFiles) {
  const filePath = path.join(__dirname, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const agentName = file.replace('.md', '');

  if (!content.startsWith('---\n')) {
    console.log(`⚠️  ${file} - No frontmatter, skipping`);
    skipped++;
    continue;
  }

  const endOfFrontmatter = content.indexOf('\n---', 4);
  if (endOfFrontmatter === -1) {
    console.log(`⚠️  ${file} - Malformed frontmatter, skipping`);
    skipped++;
    continue;
  }

  const frontmatter = content.substring(4, endOfFrontmatter);
  const body = content.substring(endOfFrontmatter + 5); // +5 to skip "\n---\n"

  // Parse existing fields
  const fields = {};
  frontmatter.split('\n').forEach(line => {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      fields[match[1].trim()] = match[2].trim();
    }
  });

  // Build standardized frontmatter
  const category = categoryMap[agentName] || 'general';
  const version = fields.version || '2025.1';
  const model = fields.model || 'sonnet';
  const color = fields.color || 'blue';
  const author = fields.author || 'IndyDevDan';
  const maturity = fields.maturity || 'production';
  const performanceTracking = fields.performance_tracking || 'enabled';

  // Extract capabilities from description and body
  const description = fields.description || fields.name || agentName.replace(/-/g, ' ');

  // Generate capabilities based on content
  let capabilities = [];
  if (body.includes('## Core Responsibilities') || body.includes('## Responsibilities')) {
    const respMatch = body.match(/## (?:Core )?Responsibilities\n([\s\S]*?)(?=\n##|$)/);
    if (respMatch) {
      capabilities = respMatch[1]
        .split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim().substring(2).trim())
        .slice(0, 5); // Top 5 capabilities
    }
  }

  if (capabilities.length === 0) {
    // Fallback to generic capabilities based on category
    const fallbackCapabilities = {
      orchestration: ['Multi-agent coordination', 'Task delegation', 'Workflow optimization'],
      intelligence: ['Data analysis', 'Pattern recognition', 'Strategic insights'],
      monitoring: ['Health monitoring', 'Performance tracking', 'Alert management'],
      infrastructure: ['Resource management', 'System coordination', 'Configuration management'],
      development: ['Code development', 'Architecture design', 'Best practices'],
      operations: ['Infrastructure automation', 'Deployment management', 'Operational excellence'],
      security: ['Security analysis', 'Compliance management', 'Risk assessment'],
      data: ['Data processing', 'Analytics', 'Pipeline management'],
      quality: ['Test automation', 'Quality assurance', 'Bug detection'],
      documentation: ['Documentation creation', 'Technical writing', 'Content management'],
      integration: ['System integration', 'API coordination', 'Data synchronization'],
      research: ['Research analysis', 'Information gathering', 'Report generation']
    };
    capabilities = fallbackCapabilities[category] || ['Task execution', 'Problem solving', 'Analysis'];
  }

  // Build new frontmatter
  let newFrontmatter = `---
name: ${agentName}
version: ${version}
category: ${category}
maturity: ${maturity}
description: ${description}
model: ${model}
color: ${color}
performance_tracking: ${performanceTracking}
author: ${author}
capabilities:`;

  capabilities.forEach(cap => {
    newFrontmatter += `\n  - ${cap}`;
  });

  // Add integration_contracts if present
  if (fields.integration_contracts) {
    newFrontmatter += `\nintegration_contracts: ${fields.integration_contracts}`;
  }

  // Add orchestration_level if present
  if (fields.orchestration_level) {
    newFrontmatter += `\norchestration_level: ${fields.orchestration_level}`;
  }

  newFrontmatter += '\n---';

  // Write updated file
  const newContent = newFrontmatter + '\n' + body;
  fs.writeFileSync(filePath, newContent, 'utf8');

  console.log(`✅ ${file}`);
  fixed++;
}

console.log(`\n\n📊 SUMMARY:`);
console.log(`Fixed: ${fixed}`);
console.log(`Skipped: ${skipped}`);
console.log(`Total: ${agentFiles.length}`);
