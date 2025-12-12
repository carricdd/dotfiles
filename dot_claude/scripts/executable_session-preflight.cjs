#!/usr/bin/env node

/**
 * Session Preflight Check v2.0
 *
 * Run this at the START of every Claude Code session to:
 * 1. Load mesh topology and verify nodes
 * 2. Show last session's performance metrics
 * 3. Remind Claude of MANDATORY execution rules
 * 4. Set baseline for performance comparison
 * 5. Load relevant memories from Universal Memory System
 *
 * Usage: node ~/.claude/scripts/session-preflight.cjs
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// Import memory loader
let UniversalMemoryLoader;
try {
    UniversalMemoryLoader = require('./universal-memory-loader.cjs');
} catch (err) {
    // Memory loader not available - continue without it
    UniversalMemoryLoader = null;
}

const MESH_TOPOLOGY = path.join(os.homedir(), '.claude/mesh/topology.json');
const PROGRESS_FILE = path.join(os.homedir(), 'Projects/cloudraider/CloudRaider-Portal/progress.md');

async function main() {
    console.log('\n' + '═'.repeat(60));
    console.log('  CLAUDE CODE SESSION PREFLIGHT CHECK');
    console.log('═'.repeat(60));

    // 1. Load and display mesh topology
    console.log('\n📡 MESH STATUS');
    console.log('─'.repeat(40));
    try {
        const mesh = JSON.parse(fs.readFileSync(MESH_TOPOLOGY, 'utf8'));
        console.log(`Total Capacity: ${mesh.totals.cpuCores} cores, ${mesh.totals.ramGB}GB RAM, ${mesh.totals.gpusActive} GPUs`);
        console.log(`Active Nodes: ${mesh.totals.nodesActive}/${mesh.totals.nodesActive + mesh.totals.nodesOffline}`);
        console.log('\nNode Status:');
        Object.entries(mesh.nodes).forEach(([id, node]) => {
            const status = node.status === 'active' ? '✅' : '❌';
            console.log(`  ${status} ${id}: ${node.specs?.cores || '?'} cores, ${node.specs?.ramGB || '?'}GB${node.specs?.gpu ? ', ' + node.specs.gpu : ''}`);
        });
    } catch (err) {
        console.log('⚠️  Could not load mesh topology');
    }

    // 2. Show last session context
    console.log('\n📋 LAST SESSION');
    console.log('─'.repeat(40));
    try {
        const progress = fs.readFileSync(PROGRESS_FILE, 'utf8');
        const lastUpdated = progress.match(/\*\*Last Updated\*\*:\s*([^\n]+)/)?.[1] || 'Unknown';
        console.log(`Last session: ${lastUpdated}`);

        // Extract incomplete tasks
        const inProgress = progress.match(/- \[ \] .+/g) || [];
        if (inProgress.length > 0) {
            console.log(`\nUnfinished tasks (${inProgress.length}):`);
            inProgress.slice(0, 5).forEach(task => console.log(`  ${task}`));
            if (inProgress.length > 5) console.log(`  ... and ${inProgress.length - 5} more`);
        }
    } catch (err) {
        console.log('No progress.md found');
    }

    // 3. MANDATORY RULES REMINDER
    console.log('\n' + '⚠️'.repeat(20));
    console.log('\n🚨 MANDATORY EXECUTION RULES - NO EXCEPTIONS 🚨');
    console.log('─'.repeat(40));
    console.log(`
┌─────────────────────────────────────────────────────────┐
│  MESH + PARALLEL + CRAOF + MEASURE = DEFAULT            │
└─────────────────────────────────────────────────────────┘

1. PARALLEL BY DEFAULT
   - Spawn 10-15 agents for complex tasks
   - NEVER serialize when parallel is possible
   - Single message with multiple Task tool invocations

2. USE THE MESH (90 cores available)
   - mac01: Quick tasks, control
   - mac00: Heavy compute, M3 Max GPU
   - ymir: Heavy CPU (24 cores)
   - loki: CUDA GPU tasks
   - mac03: Overflow compute

3. MEASURE EVERYTHING
   - Track agent count, duration, node assignment
   - Log mesh utilization percentage
   - Compare to previous runs

4. WARN ON INEFFICIENCY
   - <5 agents when more possible = WARNING
   - Only using mac01 = WARNING
   - Sequential when parallel possible = WARNING
   - Mesh utilization <50% = WARNING
`);

    // 4. Performance baseline
    console.log('\n📊 PERFORMANCE BASELINE');
    console.log('─'.repeat(40));
    console.log('Target metrics for this session:');
    console.log('  - Sitrep: 12+ agents, <30 seconds');
    console.log('  - Complex analysis: 8+ agents, mesh utilization >60%');
    console.log('  - Simple queries: 3+ parallel where applicable');

    // 5. Load Universal Memory
    console.log('\n🧠 UNIVERSAL MEMORY');
    console.log('─'.repeat(40));
    if (UniversalMemoryLoader) {
        try {
            const loader = new UniversalMemoryLoader();
            const context = await loader.loadMemories();

            // Show memory stats
            const prefs = context.memories.global_preferences.preferences?.length || 0;
            const learnings = context.memories.recent_learnings?.length || 0;
            const projectCtx = context.memories.project_context.contexts?.length || 0;
            const customerIntel = context.memories.customer_intelligence?.length || 0;

            console.log(`Loaded: ${prefs} preferences, ${learnings} learnings, ${projectCtx} project contexts, ${customerIntel} customer intel`);

            // Show top learnings (most relevant to current session)
            if (context.memories.recent_learnings?.length > 0) {
                console.log('\nTop Learnings:');
                context.memories.recent_learnings.slice(0, 5).forEach((learning, i) => {
                    const summary = learning.summary?.slice(0, 80) || 'No summary';
                    console.log(`  ${i + 1}. ${summary}`);
                });
            }

            // Show customer intel if any
            if (context.memories.customer_intelligence?.length > 0) {
                console.log('\nCustomer Intel:');
                context.memories.customer_intelligence.slice(0, 3).forEach((intel, i) => {
                    const summary = intel.summary?.slice(0, 60) || 'No summary';
                    console.log(`  ${i + 1}. ${summary}`);
                });
            }

            console.log(`\n✅ Memory cached at: ~/.claude/memory-cache/latest-session.json`);
        } catch (err) {
            console.log(`⚠️  Memory load failed: ${err.message}`);
            console.log('   Continuing without memory context');
        }
    } else {
        console.log('⚠️  Memory loader not available');
        console.log('   Run: cd ~/.claude/scripts && npm install');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('  SESSION READY - ENFORCE THESE RULES');
    console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
