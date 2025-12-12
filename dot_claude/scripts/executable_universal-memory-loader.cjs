#!/usr/bin/env node
/**
 * Universal Memory Loader for Claude Code
 *
 * Automatically loads relevant memories at session start
 * Works across ALL projects, ALL LLMs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

class UniversalMemoryLoader {
  constructor() {
    this.loadCredentials();
    this.supabase = createClient(this.url, this.serviceKey);
    this.cacheDir = path.join(os.homedir(), '.claude', 'memory-cache');
    this.ensureCacheDir();
  }

  loadCredentials() {
    // Read from ~/.zsh_env
    const zshEnvPath = path.join(os.homedir(), '.zsh_env');

    if (!fs.existsSync(zshEnvPath)) {
      console.error('❌ ~/.zsh_env not found - memory system disabled');
      process.exit(1);
    }

    const envContent = fs.readFileSync(zshEnvPath, 'utf-8');

    // Extract MEMORY credentials (with or without quotes)
    const urlMatch = envContent.match(/export MEMORY_SUPABASE_URL[=]"?([^"\n]+)"?/);
    const keyMatch = envContent.match(/export MEMORY_SUPABASE_SERVICE_ROLE_KEY[=]"?([^"\n]+)"?/);

    if (!urlMatch || !keyMatch) {
      console.error('❌ MEMORY_SUPABASE credentials not found in ~/.zsh_env');
      console.log('Add them with:');
      console.log('  echo \'export MEMORY_SUPABASE_URL="https://your-project.supabase.co"\' >> ~/.zsh_env');
      console.log('  echo \'export MEMORY_SUPABASE_SERVICE_ROLE_KEY="your-key"\' >> ~/.zsh_env');
      process.exit(1);
    }

    this.url = urlMatch[1].replace(/"/g, '');  // Remove any quotes
    this.serviceKey = keyMatch[1].replace(/"/g, '');  // Remove any quotes
  }

  ensureCacheDir() {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  async loadMemories() {
    const context = {
      cwd: process.cwd(),
      project: this.detectProject(),
      timestamp: new Date().toISOString(),
      memories: {
        global_preferences: await this.loadGlobalPreferences(),
        project_context: await this.loadProjectContext(),
        recent_learnings: await this.loadRecentLearnings(),
        customer_intelligence: await this.loadCustomerIntelligence()
      }
    };

    // Cache locally for fast access
    this.cacheMemories(context);

    return context;
  }

  detectProject() {
    const cwd = process.cwd();
    const projectName = path.basename(cwd);

    // Check if it's a known CloudRaider project
    if (cwd.includes('cloudraider')) {
      return {
        name: projectName,
        type: 'cloudraider',
        ecosystem: 'enterprise_security'
      };
    }

    return {
      name: projectName,
      type: 'unknown',
      ecosystem: 'general'
    };
  }

  async loadGlobalPreferences() {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .eq('memory_type', 'user_preference')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return {
        theme: 'dark',  // Always dark theme
        emoji_policy: 'internal_only',  // No emojis in customer docs
        commit_style: 'descriptive',
        preferences: data || []
      };
    } catch (err) {
      console.warn('⚠️  Could not load global preferences:', err.message);
      return { theme: 'dark', emoji_policy: 'internal_only', preferences: [] };
    }
  }

  async loadProjectContext() {
    try {
      const project = this.detectProject();

      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .eq('memory_type', 'project_context')
        .contains('tags', [project.name.toLowerCase()])
        .order('importance', { ascending: false })
        .limit(10);

      if (error) throw error;

      return {
        project: project.name,
        contexts: data || [],
        summary: this.summarizeProjectContext(data)
      };
    } catch (err) {
      console.warn('⚠️  Could not load project context:', err.message);
      return { project: 'unknown', contexts: [], summary: {} };
    }
  }

  async loadRecentLearnings() {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .eq('memory_type', 'learning')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .order('importance', { ascending: false })
        .limit(15);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.warn('⚠️  Could not load recent learnings:', err.message);
      return [];
    }
  }

  async loadCustomerIntelligence() {
    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .eq('memory_type', 'customer_intelligence')
        .order('updated_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.warn('⚠️  Could not load customer intelligence:', err.message);
      return [];
    }
  }

  summarizeProjectContext(contexts) {
    if (!contexts || contexts.length === 0) {
      return { status: 'new_project', learnings: [] };
    }

    return {
      status: 'known_project',
      key_patterns: contexts.filter(c => c.tags?.includes('pattern')).map(c => c.summary),
      architecture: contexts.find(c => c.tags?.includes('architecture'))?.summary,
      recent_changes: contexts.slice(0, 3).map(c => ({
        summary: c.summary,
        date: c.created_at
      }))
    };
  }

  cacheMemories(context) {
    const cachePath = path.join(this.cacheDir, 'latest-session.json');
    fs.writeFileSync(cachePath, JSON.stringify(context, null, 2));

    // Also save project-specific cache
    const projectCachePath = path.join(
      this.cacheDir,
      `${context.project.name}-context.json`
    );
    fs.writeFileSync(projectCachePath, JSON.stringify(context.memories.project_context, null, 2));
  }

  formatForClaude(context) {
    const output = [];

    output.push('# 🧠 UNIVERSAL MEMORY CONTEXT');
    output.push('');
    output.push(`**Project**: ${context.project.name} (${context.project.type})`);
    output.push(`**Session Started**: ${new Date(context.timestamp).toLocaleString()}`);
    output.push('');

    // Global Preferences
    output.push('## 🎨 Your Preferences (ALWAYS APPLY)');
    output.push('- **Theme**: Dark mode always (slate-900/slate-800 backgrounds)');
    output.push('- **Emojis**: Internal docs only, NEVER in customer-facing documents');
    output.push('- **Commits**: Descriptive with context');
    output.push('');

    // Project Context
    if (context.memories.project_context.status === 'known_project') {
      output.push('## 📁 Project Context');
      output.push(`**Status**: Known project with ${context.memories.project_context.contexts.length} stored contexts`);

      if (context.memories.project_context.summary.architecture) {
        output.push(`**Architecture**: ${context.memories.project_context.summary.architecture}`);
      }

      if (context.memories.project_context.summary.key_patterns?.length > 0) {
        output.push('**Key Patterns**:');
        context.memories.project_context.summary.key_patterns.forEach(p => {
          output.push(`  - ${p}`);
        });
      }
      output.push('');
    }

    // Recent Learnings
    if (context.memories.recent_learnings.length > 0) {
      output.push('## 💡 Recent Learnings (Apply When Relevant)');
      context.memories.recent_learnings.slice(0, 5).forEach(learning => {
        output.push(`- **${learning.summary}**: ${learning.content.slice(0, 100)}...`);
      });
      output.push('');
    }

    // Customer Intelligence
    if (context.memories.customer_intelligence.length > 0) {
      output.push('## 🏢 Customer Intelligence');
      context.memories.customer_intelligence.forEach(intel => {
        output.push(`- **${intel.summary}**: ${intel.content.slice(0, 100)}...`);
      });
      output.push('');
    }

    output.push('---');
    output.push('*Memory loaded from Universal Memory System - applies across all projects and LLMs*');

    return output.join('\n');
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    try {
      console.log('🧠 Loading Universal Memory...\n');

      const loader = new UniversalMemoryLoader();
      const context = await loader.loadMemories();
      const formatted = loader.formatForClaude(context);

      console.log(formatted);
      console.log('\n✅ Memory loaded successfully!');
      console.log(`📁 Cached at: ${loader.cacheDir}/latest-session.json`);

    } catch (error) {
      console.error('❌ Error loading memory:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = UniversalMemoryLoader;
