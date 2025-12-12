#!/usr/bin/env node
/**
 * Universal Context Loader
 *
 * Loads ALL project context from Supabase on session start
 * Makes Claude Code directory-independent - work from anywhere
 *
 * Auto-runs on every Claude Code session start (via hook)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

class UniversalContextLoader {
  constructor() {
    // Load from ~/.zsh_env (where all secrets live)
    this.loadEnvironment();

    this.supabase = createClient(
      process.env.MEMORY_SUPABASE_URL,
      process.env.MEMORY_SUPABASE_SERVICE_ROLE_KEY
    );

    this.contextPath = path.join(os.homedir(), '.claude', 'session-context.json');
  }

  loadEnvironment() {
    // Read ~/.zsh_env and load into process.env
    const envPath = path.join(os.homedir(), '.zsh_env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const lines = envContent.split('\n');

      for (const line of lines) {
        // Parse: export KEY="value" or export KEY=value
        const match = line.match(/^export\s+([A-Z_]+)="?([^"]+)"?$/);
        if (match) {
          const [, key, value] = match;
          process.env[key] = value;
        }
      }
    }
  }

  async loadMeshStatus() {
    /**
     * Load mesh nodes, LLM instances, current jobs
     * Falls back to local JSON files if Supabase unavailable
     */
    try {
      // Try Supabase first
      const { data: nodes, error } = await this.supabase
        .from('mesh_nodes')
        .select('*')
        .eq('status', 'active');

      // If Supabase fails, fall back to local files
      if (error || !nodes || nodes.length === 0) {
        console.log('⚠️  Supabase unavailable, reading from local mesh files...');
        return this.loadMeshStatusFromFiles();
      }

      const { data: llms } = await this.supabase
        .from('llm_instances')
        .select('*')
        .in('status', ['ready', 'busy']);

      const { data: jobs } = await this.supabase
        .from('mesh_jobs')
        .select('*')
        .eq('status', 'running')
        .order('submitted_at', { ascending: false })
        .limit(10);

      return {
        active_nodes: nodes?.length || 0,
        total_cpu_cores: nodes?.reduce((sum, n) => sum + (n.capabilities?.cpu_cores || 0), 0) || 0,
        total_ram_gb: nodes?.reduce((sum, n) => sum + (n.capabilities?.ram_gb || 0), 0) || 0,
        active_llms: llms?.length || 0,
        running_jobs: jobs?.length || 0,
        nodes: nodes || [],
        llms: llms || [],
        jobs: jobs || []
      };
    } catch (error) {
      console.log('⚠️  Supabase error, reading from local mesh files...');
      return this.loadMeshStatusFromFiles();
    }
  }

  loadMeshStatusFromFiles() {
    /**
     * Load mesh status from local JSON files (fallback)
     */
    try {
      const meshPath = path.join(os.homedir(), 'Projects', 'mesh', 'data', 'mesh_node_registry.json');

      if (!fs.existsSync(meshPath)) {
        return {
          active_nodes: 0,
          total_cpu_cores: 0,
          total_ram_gb: 0,
          active_llms: 0,
          running_jobs: 0,
          nodes: [],
          llms: [],
          jobs: []
        };
      }

      const meshData = JSON.parse(fs.readFileSync(meshPath, 'utf8'));
      const activeNodes = Object.entries(meshData)
        .filter(([_, node]) => node.status === 'active')
        .map(([node_id, node]) => ({
          node_id,
          hostname: node.hostname,
          current_ip: node.current_ip,
          capabilities: node.capabilities,
          status: node.status,
          last_seen: node.last_seen
        }));

      const totalCores = activeNodes.reduce((sum, n) => sum + (n.capabilities?.cpu_cores || 0), 0);
      const totalRam = activeNodes.reduce((sum, n) => sum + (n.capabilities?.ram_gb || 0), 0);

      return {
        active_nodes: activeNodes.length,
        total_cpu_cores: totalCores,
        total_ram_gb: totalRam,
        active_llms: 0, // Would need to check LLM orchestrator
        running_jobs: 0, // Would need to check job queue
        nodes: activeNodes,
        llms: [],
        jobs: [],
        source: 'local_files'
      };
    } catch (error) {
      console.error('Error loading from local files:', error.message);
      return {
        active_nodes: 0,
        total_cpu_cores: 0,
        total_ram_gb: 0,
        active_llms: 0,
        running_jobs: 0,
        nodes: [],
        llms: [],
        jobs: []
      };
    }
  }

  async loadProjects() {
    /**
     * Load recent project activity
     */
    try {
      const projects = [
        {
          name: 'Universal Mesh',
          path: '~/Projects/mesh',
          description: 'Distributed compute platform with LLM orchestration',
          status: 'operational',
          last_activity: new Date().toISOString()
        },
        {
          name: 'CloudRaider Portal',
          path: '~/Projects/cloudraider/CloudRaider-Portal',
          description: 'Customer dashboard and SOC platform',
          status: 'active',
          agents: ['teams-alert-poster', 'teams-monitor', 'email-monitor', 'lifescan-monitor'],
          last_activity: new Date().toISOString()
        },
        {
          name: 'Investor/Wealth Advisor',
          path: '~/Projects/Personal/Finance/Investor',
          description: 'Trading alerts and portfolio management',
          status: 'active',
          last_activity: new Date().toISOString()
        }
      ];

      return projects;
    } catch (error) {
      console.error('Error loading projects:', error.message);
      return [];
    }
  }

  async loadRecentWork() {
    /**
     * Load recent sessions and work context
     */
    try {
      // Try to load from memory system
      const { data: sessions } = await this.supabase
        .from('claude_sessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      return sessions || [];
    } catch (error) {
      console.error('Error loading recent work:', error.message);
      return [];
    }
  }

  async load() {
    console.log('🔄 Loading universal context...\n');

    const context = {
      loaded_at: new Date().toISOString(),
      mesh: await this.loadMeshStatus(),
      projects: await this.loadProjects(),
      recent_work: await this.loadRecentWork(),
      system: {
        user: os.userInfo().username,
        hostname: os.hostname(),
        platform: os.platform(),
        cwd: process.cwd()
      }
    };

    // Write to cache file
    const cacheDir = path.dirname(this.contextPath);
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    fs.writeFileSync(
      this.contextPath,
      JSON.stringify(context, null, 2),
      'utf8'
    );

    // Print summary
    console.log('✅ Universal context loaded!\n');
    console.log('📊 Mesh Status:');
    console.log(`   • ${context.mesh.active_nodes} nodes active`);
    console.log(`   • ${context.mesh.total_cpu_cores} CPU cores`);
    console.log(`   • ${context.mesh.total_ram_gb} GB RAM`);
    console.log(`   • ${context.mesh.active_llms} LLMs running`);
    console.log(`   • ${context.mesh.running_jobs} jobs active\n`);

    console.log('📁 Projects:');
    for (const proj of context.projects) {
      console.log(`   • ${proj.name} - ${proj.status}`);
    }
    console.log('');

    console.log(`💾 Context cached: ${this.contextPath}\n`);

    return context;
  }
}

// Run if executed directly
if (require.main === module) {
  const loader = new UniversalContextLoader();
  loader.load().catch(console.error);
}

module.exports = { UniversalContextLoader };
