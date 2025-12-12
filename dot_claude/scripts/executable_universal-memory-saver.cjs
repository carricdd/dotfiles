#!/usr/bin/env node
/**
 * Universal Memory Saver for Claude Code
 *
 * Saves learnings, decisions, and context to universal memory
 * Works across ALL projects, ALL LLMs
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

class UniversalMemorySaver {
  constructor() {
    this.loadCredentials();
    this.supabase = createClient(this.url, this.serviceKey);
  }

  loadCredentials() {
    const zshEnvPath = path.join(os.homedir(), '.zsh_env');

    if (!fs.existsSync(zshEnvPath)) {
      console.error('❌ ~/.zsh_env not found');
      process.exit(1);
    }

    const envContent = fs.readFileSync(zshEnvPath, 'utf-8');

    const urlMatch = envContent.match(/export MEMORY_SUPABASE_URL[=]"?([^"\n]+)"?/);
    const keyMatch = envContent.match(/export MEMORY_SUPABASE_SERVICE_ROLE_KEY[=]"?([^"\n]+)"?/);

    if (!urlMatch || !keyMatch) {
      console.error('❌ MEMORY credentials not found in ~/.zsh_env');
      process.exit(1);
    }

    this.url = urlMatch[1].replace(/"/g, '');  // Remove any quotes
    this.serviceKey = keyMatch[1].replace(/"/g, '');  // Remove any quotes
  }

  async createSession(metadata = {}) {
    const sessionData = {
      session_id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      llm_provider: metadata.llm_provider || 'claude',
      llm_model: metadata.llm_model || 'claude-sonnet-4.5',
      user_id: metadata.user_id || 'carric',
      context: {
        cwd: process.cwd(),
        project_name: path.basename(process.cwd()),
        ...metadata
      }
    };

    const { data, error } = await this.supabase
      .from('sessions')
      .insert(sessionData)
      .select()
      .single();

    if (error) throw error;

    return data;
  }

  async saveMemory(memory) {
    const {
      content,
      summary,
      memoryType = 'learning',
      importance = 0.5,
      tags = [],
      relatedTo = []
    } = memory;

    // Get or create session
    if (!this.currentSession) {
      this.currentSession = await this.createSession();
    }

    const memoryData = {
      session_id: this.currentSession.id,
      content,
      summary: summary || content.slice(0, 100),
      memory_type: memoryType,
      importance,
      tags,
      embedding: null, // TODO: Generate embeddings
      metadata: {
        project: path.basename(process.cwd()),
        timestamp: new Date().toISOString(),
        ...memory.metadata
      }
    };

    const { data, error } = await this.supabase
      .from('memories')
      .insert(memoryData)
      .select()
      .single();

    if (error) throw error;

    // Create relationships if provided
    if (relatedTo.length > 0) {
      await this.createRelationships(data.id, relatedTo);
    }

    return data;
  }

  async createRelationships(sourceId, relatedIds) {
    const relationships = relatedIds.map(targetId => ({
      source_memory_id: sourceId,
      target_memory_id: targetId,
      relationship_type: 'relates_to',
      strength: 0.5
    }));

    const { error } = await this.supabase
      .from('memory_relationships')
      .insert(relationships);

    if (error) throw error;
  }

  async endSession(summary = null) {
    if (!this.currentSession) return;

    // Update session context with summary
    const updateData = {
      ended_at: new Date().toISOString()
    };

    if (summary) {
      updateData.context = {
        ...this.currentSession.context,
        session_summary: summary
      };
    }

    const { error } = await this.supabase
      .from('sessions')
      .update(updateData)
      .eq('id', this.currentSession.id);

    if (error) throw error;
  }

  // Quick save helpers
  async saveLearning(content, summary, importance = 0.7) {
    return this.saveMemory({
      content,
      summary,
      memoryType: 'learning',
      importance,
      tags: ['learning', 'pattern']
    });
  }

  async saveProjectContext(content, summary, importance = 0.6) {
    return this.saveMemory({
      content,
      summary,
      memoryType: 'project_context',
      importance,
      tags: ['project', path.basename(process.cwd()).toLowerCase()]
    });
  }

  async saveCustomerIntelligence(customer, content, summary, importance = 0.8) {
    return this.saveMemory({
      content,
      summary,
      memoryType: 'customer_intelligence',
      importance,
      tags: ['customer', customer.toLowerCase()]
    });
  }

  async saveUserPreference(preference, value, importance = 0.9) {
    return this.saveMemory({
      content: `User preference: ${preference} = ${value}`,
      summary: `${preference}: ${value}`,
      memoryType: 'user_preference',
      importance,
      tags: ['preference', preference]
    });
  }
}

// CLI usage
if (require.main === module) {
  (async () => {
    const command = process.argv[2];
    const content = process.argv[3];
    const summary = process.argv[4];

    if (!command) {
      console.log('Usage:');
      console.log('  node universal-memory-saver.cjs learning "content" "summary"');
      console.log('  node universal-memory-saver.cjs project "content" "summary"');
      console.log('  node universal-memory-saver.cjs customer "customer-name" "content" "summary"');
      console.log('  node universal-memory-saver.cjs preference "key" "value"');
      process.exit(1);
    }

    try {
      const saver = new UniversalMemorySaver();

      let result;
      switch (command) {
        case 'learning':
          result = await saver.saveLearning(content, summary);
          console.log('✅ Learning saved:', result.id);
          break;

        case 'project':
          result = await saver.saveProjectContext(content, summary);
          console.log('✅ Project context saved:', result.id);
          break;

        case 'customer':
          const customer = content;
          const custContent = summary;
          const custSummary = process.argv[5];
          result = await saver.saveCustomerIntelligence(customer, custContent, custSummary);
          console.log('✅ Customer intelligence saved:', result.id);
          break;

        case 'preference':
          const key = content;
          const value = summary;
          result = await saver.saveUserPreference(key, value);
          console.log('✅ Preference saved:', result.id);
          break;

        default:
          console.error('❌ Unknown command:', command);
          process.exit(1);
      }

      await saver.endSession(`Saved ${command} via CLI`);

    } catch (error) {
      console.error('❌ Error saving memory:', error.message);
      process.exit(1);
    }
  })();
}

module.exports = UniversalMemorySaver;
