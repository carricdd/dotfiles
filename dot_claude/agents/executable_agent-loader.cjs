#!/usr/bin/env node

/**
 * CloudRaider Intelligent Agent Loader
 *
 * Detects session type from user input and loads appropriate agent tiers.
 * Provides 69% token savings through intelligent, context-aware loading.
 *
 * @version 1.0
 * @date 2025-10-28
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(process.env.HOME, '.claude', 'agents');
const REGISTRY_PATH = path.join(AGENTS_DIR, 'agent-registry.json');

class AgentLoader {
  constructor() {
    this.registry = this.loadRegistry();
    this.loadedAgents = new Set();
  }

  loadRegistry() {
    try {
      const data = fs.readFileSync(REGISTRY_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Failed to load agent registry:', error.message);
      process.exit(1);
    }
  }

  /**
   * Detect session type from user message
   */
  detectSessionType(message) {
    const lowercaseMsg = message.toLowerCase();
    const sessionTypes = this.registry.sessionTypes;

    const scores = {};

    for (const [type, config] of Object.entries(sessionTypes)) {
      let score = 0;

      // Count keyword matches
      for (const keyword of config.keywords) {
        if (lowercaseMsg.includes(keyword.toLowerCase())) {
          score++;
        }
      }

      // Weight by frequency
      scores[type] = score * (config.frequency / 100);
    }

    // Find highest scoring session type
    const detected = Object.entries(scores)
      .sort((a, b) => b[1] - a[1])[0];

    if (detected && detected[1] > 0) {
      return detected[0];
    }

    // Default to SOC operations (most common)
    return 'soc-operations';
  }

  /**
   * Get agents to load for session type
   */
  getAgentsForSession(sessionType) {
    const config = this.registry.sessionTypes[sessionType];
    if (!config) {
      console.warn(`⚠️  Unknown session type: ${sessionType}`);
      return this.getAllTier1Agents();
    }

    const agents = new Set();

    // Add required Tier 1 agents
    if (config.requiredTier1) {
      config.requiredTier1.forEach(agent => agents.add(agent));
    }

    // Add recommended Tier 2 agents
    if (config.recommendedTier2) {
      config.recommendedTier2.forEach(agent => agents.add(agent));
    }

    return Array.from(agents);
  }

  /**
   * Get all Tier 1 core agents
   */
  getAllTier1Agents() {
    return this.registry.tiers.tier1.agents.map(a => a.name);
  }

  /**
   * Check if message contains triggers for Tier 2/3 agents
   */
  detectTriggeredAgents(message) {
    const lowercaseMsg = message.toLowerCase();
    const triggered = new Set();

    // Check Tier 2 agents
    for (const agent of this.registry.tiers.tier2.agents) {
      if (agent.triggers) {
        for (const trigger of agent.triggers) {
          if (lowercaseMsg.includes(trigger.toLowerCase())) {
            triggered.add(agent.name);
            break;
          }
        }
      }
    }

    // Check Tier 3 agents
    for (const agent of this.registry.tiers.tier3.agents) {
      if (agent.triggers) {
        for (const trigger of agent.triggers) {
          if (lowercaseMsg.includes(trigger.toLowerCase())) {
            triggered.add(agent.name);
            break;
          }
        }
      }
    }

    return Array.from(triggered);
  }

  /**
   * Calculate token cost for agents
   */
  calculateTokenCost(agentNames) {
    let total = 0;

    for (const tier of ['tier1', 'tier2', 'tier3']) {
      for (const agent of this.registry.tiers[tier].agents) {
        if (agentNames.includes(agent.name)) {
          total += agent.tokens;
        }
      }
    }

    return total;
  }

  /**
   * Get agent info
   */
  getAgentInfo(agentName) {
    for (const tier of ['tier1', 'tier2', 'tier3']) {
      const agent = this.registry.tiers[tier].agents.find(a => a.name === agentName);
      if (agent) {
        return { ...agent, tier };
      }
    }
    return null;
  }

  /**
   * Display loading summary
   */
  displaySummary(sessionType, agents, triggeredAgents = []) {
    const config = this.registry.sessionTypes[sessionType];
    const tokenCost = this.calculateTokenCost(agents);
    const savingsPercent = Math.round((1 - tokenCost / 1500) * 100);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║         CloudRaider Intelligent Agent Loader v1.0          ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Session Type: ${sessionType}`);
    console.log(`📝 Description: ${config.description}`);
    console.log(`🎯 Frequency: ${config.frequency}% of sessions\n`);

    console.log('✅ Agents Loaded:');

    // Group by tier
    const tier1 = agents.filter(name => {
      const info = this.getAgentInfo(name);
      return info && info.tier === 'tier1';
    });

    const tier2 = agents.filter(name => {
      const info = this.getAgentInfo(name);
      return info && info.tier === 'tier2';
    });

    if (tier1.length > 0) {
      console.log(`  Tier 1 (Core): ${tier1.length} agents`);
      tier1.forEach(name => {
        const info = this.getAgentInfo(name);
        console.log(`    • ${name} - ${info.description}`);
      });
    }

    if (tier2.length > 0) {
      console.log(`\n  Tier 2 (Situational): ${tier2.length} agents`);
      tier2.forEach(name => {
        const info = this.getAgentInfo(name);
        console.log(`    • ${name} - ${info.description}`);
      });
    }

    if (triggeredAgents.length > 0) {
      console.log(`\n  🔔 Triggered by keywords: ${triggeredAgents.length} agents`);
      triggeredAgents.forEach(name => {
        const info = this.getAgentInfo(name);
        console.log(`    • ${name} - ${info.description}`);
      });
    }

    console.log(`\n💾 Token Usage:`);
    console.log(`  Loaded: ${tokenCost} tokens`);
    console.log(`  Saved: ${1500 - tokenCost} tokens (${savingsPercent}% reduction)`);
    console.log(`  Available: ${200000 - tokenCost - 41000} tokens for work\n`);

    console.log('────────────────────────────────────────────────────────────\n');
  }

  /**
   * List all available agents by tier
   */
  listAgents() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║              CloudRaider Agent Registry v1.0               ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    // Tier 1
    console.log('📦 TIER 1: Core Agents (Always Load)');
    console.log(`   Usage: 80-100% | Token Cost: ${this.registry.tiers.tier1.tokenCost}\n`);
    this.registry.tiers.tier1.agents.forEach(agent => {
      console.log(`   • ${agent.name}`);
      console.log(`     ${agent.description} (${agent.category})`);
      console.log(`     Usage: ${agent.usage}% | Tokens: ${agent.tokens}\n`);
    });

    // Tier 2
    console.log('\n📦 TIER 2: Situational Agents (Load on Demand)');
    console.log(`   Usage: 20-80% | Token Cost: ${this.registry.tiers.tier2.tokenCost} | Weighted: ${this.registry.tiers.tier2.weightedCost}\n`);
    this.registry.tiers.tier2.agents.forEach(agent => {
      console.log(`   • ${agent.name}`);
      console.log(`     ${agent.description} (${agent.category})`);
      console.log(`     Triggers: ${agent.triggers.join(', ')}`);
      console.log(`     Usage: ${agent.usage}% | Tokens: ${agent.tokens}\n`);
    });

    // Tier 3
    console.log('\n📦 TIER 3: Specialized Agents (Explicit Only)');
    console.log(`   Usage: <20% | Token Cost: ${this.registry.tiers.tier3.tokenCost} | Weighted: ${this.registry.tiers.tier3.weightedCost}\n`);
    this.registry.tiers.tier3.agents.forEach(agent => {
      console.log(`   • ${agent.name}`);
      console.log(`     ${agent.description} (${agent.category})`);
      console.log(`     Triggers: ${agent.triggers.join(', ')}`);
      console.log(`     Usage: ${agent.usage}% | Tokens: ${agent.tokens}\n`);
    });

    // Statistics
    const stats = this.registry.statistics;
    console.log('\n📊 Statistics:');
    console.log(`   Total Agents: ${stats.totalAgents}`);
    console.log(`   Tier 1: ${stats.tier1Count} | Tier 2: ${stats.tier2Count} | Tier 3: ${stats.tier3Count}`);
    console.log(`   Archived: ${stats.archivedCount}`);
    console.log(`   Token Savings: ${stats.tokenSavings.savingsPercent}% (${stats.tokenSavings.before} → ${stats.tokenSavings.weightedAverage})\n`);
  }

  /**
   * Show session types
   */
  listSessionTypes() {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║            CloudRaider Session Types                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

    for (const [type, config] of Object.entries(this.registry.sessionTypes)) {
      console.log(`🎯 ${type}`);
      console.log(`   ${config.description}`);
      console.log(`   Frequency: ${config.frequency}% of sessions`);
      console.log(`   Keywords: ${config.keywords.join(', ')}`);
      console.log(`   Required: ${config.requiredTier1.length} Tier 1 agents`);
      console.log(`   Recommended: ${config.recommendedTier2.length} Tier 2 agents\n`);
    }
  }
}

// CLI Interface
function main() {
  const loader = new AgentLoader();
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`
CloudRaider Intelligent Agent Loader v1.0

Usage:
  agent-loader detect <message>     Detect session type and show agents to load
  agent-loader list                  List all agents by tier
  agent-loader sessions              List session types
  agent-loader stats                 Show statistics

Examples:
  agent-loader detect "Elevos ransomware incident investigation"
  agent-loader detect "M365 security assessment for CGL"
  agent-loader detect "Build new React dashboard for threat intel"
    `);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case 'detect': {
      const message = args.slice(1).join(' ');
      if (!message) {
        console.error('❌ Error: Message required for detection');
        console.log('Usage: agent-loader detect <message>');
        process.exit(1);
      }

      const sessionType = loader.detectSessionType(message);
      const agents = loader.getAgentsForSession(sessionType);
      const triggered = loader.detectTriggeredAgents(message);

      // Merge triggered agents
      const allAgents = [...new Set([...agents, ...triggered])];

      loader.displaySummary(sessionType, allAgents, triggered);
      break;
    }

    case 'list':
      loader.listAgents();
      break;

    case 'sessions':
      loader.listSessionTypes();
      break;

    case 'stats': {
      const stats = loader.registry.statistics;
      console.log('\n📊 CloudRaider Agent Statistics\n');
      console.log(`Total Agents: ${stats.totalAgents}`);
      console.log(`  Tier 1 (Core): ${stats.tier1Count}`);
      console.log(`  Tier 2 (Situational): ${stats.tier2Count}`);
      console.log(`  Tier 3 (Specialized): ${stats.tier3Count}`);
      console.log(`  Archived: ${stats.archivedCount}\n`);

      console.log('Token Savings:');
      console.log(`  Before: ${stats.tokenSavings.before} tokens`);
      console.log(`  Tier 1 Only: ${stats.tokenSavings.tier1Only} tokens`);
      console.log(`  Weighted Avg: ${stats.tokenSavings.weightedAverage} tokens`);
      console.log(`  Savings: ${stats.tokenSavings.savingsPercent}%\n`);
      break;
    }

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "agent-loader --help" for usage information');
      process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = AgentLoader;
