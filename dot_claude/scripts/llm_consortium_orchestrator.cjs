#!/usr/bin/env node
/**
 * LLM Consortium Orchestrator
 *
 * Coordinates Claude, GPT-4, Gemini, and Perplexity as a TEAM
 * Each LLM contributes its unique strengths to every task
 *
 * USAGE:
 *   node llm_consortium_orchestrator.cjs "Generate TTX scenario for CGL"
 *   node llm_consortium_orchestrator.cjs --interactive
 *   node llm_consortium_orchestrator.cjs --task-file task.json
 *
 * WORKFLOW:
 * 1. Load universal memory (shared context for all LLMs)
 * 2. Distribute task to selected LLMs in parallel
 * 3. Collect responses from all LLMs
 * 4. Build consensus using synthesis algorithm
 * 5. Save learnings to universal memory
 * 6. Return unified response
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

class LLMConsortiumOrchestrator {
  constructor() {
    this.homeDir = os.homedir();
    this.memoryDir = path.join(this.homeDir, '.claude', 'memory');
    this.configFile = path.join(this.homeDir, '.claude', 'llm_consortium_config.json');

    // Load configuration
    this.loadConfig();

    // Initialize stats
    this.stats = {
      tasks_executed: 0,
      total_cost: 0,
      tokens_used: {},
      llm_accuracy: {},
      consensus_success_rate: 0
    };
  }

  loadConfig() {
    // Default configuration
    this.config = {
      llms: {
        claude: {
          enabled: true,
          api_key_env: 'ANTHROPIC_API_KEY',
          model: 'claude-sonnet-4-5-20250929',
          endpoint: 'https://api.anthropic.com/v1/messages',
          strengths: ['reasoning', 'code_generation', 'complex_analysis', 'security_expertise'],
          cost_per_1m_tokens: 3.00,
          max_tokens: 200000,
          priority: 1 // Always use Claude as primary
        },
        gpt5: {
          enabled: true,
          api_key_env: 'OPENAI_API_KEY',
          model: 'gpt-5', // Released August 2025 - 50% cheaper than GPT-4!
          // Alternative: 'gpt-5-mini' ($0.25/M input), 'gpt-5-nano' ($0.05/M input)
          endpoint: 'https://api.openai.com/v1/chat/completions',
          strengths: ['algorithms', 'mathematical_reasoning', 'code_optimization', 'advanced_reasoning'],
          cost_per_1m_tokens: 5.625, // Blended: $1.25 input + $10 output (avg)
          input_cost_per_1m: 1.25,
          output_cost_per_1m: 10.00,
          max_tokens: 128000,
          priority: 2 // Use for complex reasoning - NOW CHEAPER THAN CLAUDE!
        },
        gemini: {
          enabled: true,
          api_key_env: 'GEMINI_API_KEY',
          model: 'gemini-ultra-1.5',
          endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-ultra:generateContent',
          strengths: ['massive_context', 'multimodal', 'search_integration', 'pattern_recognition'],
          cost_per_1m_tokens: 7.00,
          max_tokens: 1000000, // Gemini's massive context window
          priority: 3 // Use for research and context
        },
        perplexity: {
          enabled: true,
          api_key_env: 'PERPLEXITY_API_KEY',
          model: 'sonar', // Current Sonar (Llama 3.3 70B) - lightweight grounded search
          // Alternative: 'sonar-pro' for deeper retrieval, 'sonar-reasoning' for real-time reasoning
          endpoint: 'https://api.perplexity.ai/chat/completions',
          strengths: ['real_time_research', 'web_search', 'fact_checking', 'latest_information', 'grounded_search'],
          cost_per_1m_tokens: 1.00, // $0.2-$5 depending on model + request fees
          max_tokens: 128000, // 128k context window
          priority: 4, // Use for real-time data
          search_mode: 'medium' // Options: 'low' (cost-efficient), 'medium' (balanced), 'high' (maximum depth)
        }
      },

      // Task routing rules
      routing: {
        simple_tasks: ['perplexity'], // Cheapest for simple tasks
        code_tasks: ['claude', 'gpt5'], // Code generation and validation
        research_tasks: ['perplexity', 'gemini'], // Research with latest data
        complex_tasks: ['claude', 'gpt5', 'gemini', 'perplexity'], // All hands on deck
        security_tasks: ['claude', 'gpt5', 'perplexity'], // Security expertise
        ttx_generation: ['claude', 'gpt5', 'perplexity'], // Scenarios need research + reasoning
        cost_optimized: ['gpt5', 'perplexity'] // When cost matters but quality needed
      },

      // Cost management
      budget: {
        daily_limit: 100.00, // $100/day = $3k/month
        monthly_limit: 10000.00, // $10k/month
        warn_at_percent: 80 // Warn at 80% of limit
      },

      // Consensus algorithm settings
      consensus: {
        min_agreement: 0.75, // 75% agreement required
        weight_by_confidence: true,
        require_validation: true, // Cross-validate code and facts
        merge_strategy: 'best_of_breed' // Take best parts from each LLM
      }
    };

    // Load custom config if exists
    if (fs.existsSync(this.configFile)) {
      const custom = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
      this.config = { ...this.config, ...custom };
    }
  }

  // ===========================================
  // MEMORY MANAGEMENT
  // ===========================================

  async loadUniversalMemory() {
    console.log('📚 Loading universal memory...');

    // Load from both local files and Supabase
    try {
      // Use existing memory sync system
      execSync('node ~/.claude/scripts/memory-sync.cjs --pull', {
        stdio: 'inherit',
        cwd: this.homeDir
      });

      // Parse memory files
      const memories = this.parseMemoryFiles();

      console.log(`✅ Loaded ${memories.length} memories`);
      return memories;

    } catch (error) {
      console.error('❌ Error loading memory:', error.message);
      return [];
    }
  }

  parseMemoryFiles() {
    const memories = [];

    const scanDir = (dir) => {
      if (!fs.existsSync(dir)) return;

      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && entry.name !== 'memory-cache') {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          memories.push({
            path: fullPath,
            content: content,
            type: this.inferMemoryType(fullPath),
            size: content.length
          });
        }
      }
    };

    scanDir(this.memoryDir);
    return memories;
  }

  inferMemoryType(filePath) {
    if (filePath.includes('customer') || filePath.includes('client')) return 'customer_intelligence';
    if (filePath.includes('learning')) return 'learning';
    if (filePath.includes('project')) return 'project_context';
    if (filePath.includes('preference')) return 'user_preference';
    return 'general';
  }

  async saveToUniversalMemory(learning) {
    console.log('💾 Saving to universal memory...');

    // Determine file path
    const fileName = learning.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) + '.md';

    const filePath = path.join(this.memoryDir, learning.type, fileName);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Format as markdown
    const content = this.formatMemoryAsMarkdown(learning);

    // Write to file
    fs.writeFileSync(filePath, content);

    // Sync to Supabase
    try {
      execSync('node ~/.claude/scripts/memory-sync.cjs --push', {
        stdio: 'inherit',
        cwd: this.homeDir
      });
      console.log('✅ Memory saved and synced');
    } catch (error) {
      console.error('⚠️  Memory saved locally, sync failed:', error.message);
    }
  }

  formatMemoryAsMarkdown(learning) {
    return `# ${learning.title}

**Type**: ${learning.type}
**Source LLM**: ${learning.source_llm || 'consortium'}
**Confidence**: ${learning.confidence || 0.9}
**Date**: ${new Date().toISOString()}

${learning.tags ? `**Tags**: ${learning.tags.join(', ')}` : ''}

---

${learning.content}

${learning.code_example ? `\n\`\`\`${learning.language || 'javascript'}\n${learning.code_example}\n\`\`\`\n` : ''}

${learning.related ? `\n**Related**: ${learning.related.join(', ')}\n` : ''}
`;
  }

  // ===========================================
  // TASK DISTRIBUTION
  // ===========================================

  async executeTask(taskDescription, taskType = 'complex_tasks') {
    console.log('\n🎯 Task:', taskDescription);
    console.log('📋 Type:', taskType);

    // Load context from universal memory
    const memories = await this.loadUniversalMemory();
    const context = this.buildContext(memories, taskDescription);

    // Select LLMs for this task
    const selectedLLMs = this.selectLLMs(taskType);
    console.log(`🤖 Selected LLMs: ${selectedLLMs.join(', ')}\n`);

    // Distribute task to all selected LLMs IN PARALLEL
    const responses = await this.distributeToLLMs(selectedLLMs, taskDescription, context);

    // Build consensus from responses
    const consensus = await this.buildConsensus(responses);

    // Save learnings
    if (consensus.learnings.length > 0) {
      for (const learning of consensus.learnings) {
        await this.saveToUniversalMemory(learning);
      }
    }

    // Update stats
    this.updateStats(responses, consensus);

    return consensus.final_response;
  }

  buildContext(memories, taskDescription) {
    // TODO: Use vector similarity to find most relevant memories
    // For now, include last 10 memories as context
    const recentMemories = memories.slice(-10);

    return {
      recent_learnings: recentMemories.map(m => ({
        type: m.type,
        content: m.content.slice(0, 500) // First 500 chars
      })),
      total_memories: memories.length,
      task: taskDescription
    };
  }

  selectLLMs(taskType) {
    const routing = this.config.routing[taskType] || this.config.routing.complex_tasks;

    // Filter to enabled LLMs only
    return routing.filter(llm => this.config.llms[llm]?.enabled);
  }

  async distributeToLLMs(llmNames, task, context) {
    console.log('🚀 Distributing task to LLMs...\n');

    const promises = llmNames.map(async (llmName) => {
      try {
        console.log(`   Sending to ${llmName}...`);
        const response = await this.callLLM(llmName, task, context);
        console.log(`   ✅ ${llmName} responded`);
        return { llm: llmName, success: true, response };
      } catch (error) {
        console.error(`   ❌ ${llmName} failed: ${error.message}`);
        return { llm: llmName, success: false, error: error.message };
      }
    });

    const results = await Promise.all(promises);
    return results;
  }

  async callLLM(llmName, task, context) {
    const config = this.config.llms[llmName];

    if (!config) {
      throw new Error(`Unknown LLM: ${llmName}`);
    }

    // Get API key from environment
    const apiKey = process.env[config.api_key_env];
    if (!apiKey) {
      throw new Error(`API key not found: ${config.api_key_env}`);
    }

    // Build prompt with context
    const prompt = this.buildPrompt(task, context, llmName);

    // Route to appropriate API implementation
    switch (llmName) {
      case 'perplexity':
        return await this.callPerplexityAPI(apiKey, prompt, config);
      case 'claude':
        return await this.callClaudeAPI(apiKey, prompt, config);
      case 'gpt4':
        return await this.callOpenAIAPI(apiKey, prompt, config);
      case 'gemini':
        return await this.callGeminiCLI(prompt, config);
      default:
        throw new Error(`No implementation for LLM: ${llmName}`);
    }
  }

  async callPerplexityAPI(apiKey, prompt, config) {
    const https = require('https');
    const { promisify } = require('util');

    return new Promise((resolve, reject) => {
      const requestBody = JSON.stringify({
        model: config.model,
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant with access to real-time web search and the latest information."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: config.max_tokens,
        temperature: 0.7,
        top_p: 0.9,
        stream: false
      });

      const options = {
        hostname: 'api.perplexity.ai',
        port: 443,
        path: '/chat/completions',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody)
        }
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);

            if (response.error) {
              reject(new Error(response.error.message || 'Perplexity API error'));
              return;
            }

            const content = response.choices?.[0]?.message?.content || 'No response';
            const tokensUsed = response.usage?.total_tokens || 0;

            resolve({
              content: content,
              tokens_used: tokensUsed,
              confidence: 0.9,
              cost: (tokensUsed / 1000000) * config.cost_per_1m_tokens
            });
          } catch (error) {
            reject(new Error(`Failed to parse Perplexity response: ${error.message}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(new Error(`Perplexity API request failed: ${error.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  async callClaudeAPI(apiKey, prompt, config) {
    // Use Claude CLI (simpler invocation without unsupported flags)
    const fs = require('fs');
    const tmpFile = `/tmp/llm_prompt_${Date.now()}.txt`;

    try {
      fs.writeFileSync(tmpFile, prompt);
      const response = execSync(`cat "${tmpFile}" | claude`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      fs.unlinkSync(tmpFile);

      return {
        content: response.trim(),
        tokens_used: Math.ceil(response.length / 4), // Rough estimate: 4 chars per token
        confidence: 0.95,
        cost: (Math.ceil(response.length / 4) / 1000000) * config.cost_per_1m_tokens
      };
    } catch (error) {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      throw new Error(`Claude CLI error: ${error.message}`);
    }
  }

  async callOpenAIAPI(apiKey, prompt, config) {
    // Use GPT-5 CLI (you have gpt5 running on mac00)
    const fs = require('fs');
    const tmpFile = `/tmp/llm_prompt_${Date.now()}.txt`;

    try {
      fs.writeFileSync(tmpFile, prompt);

      // Try gpt5 CLI first (you have this on mac00), fallback to codex
      let command = 'gpt5';
      try {
        execSync('which gpt5', { encoding: 'utf-8' });
      } catch {
        command = 'codex'; // Fallback to codex if gpt5 not in PATH
      }

      const response = execSync(`cat "${tmpFile}" | ${command}`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      fs.unlinkSync(tmpFile);

      const inputTokens = Math.ceil(prompt.length / 4);
      const outputTokens = Math.ceil(response.length / 4);
      const cost = (inputTokens * config.input_cost_per_1m / 1000000) +
                   (outputTokens * config.output_cost_per_1m / 1000000);

      return {
        content: response.trim(),
        tokens_used: inputTokens + outputTokens,
        confidence: 0.95, // GPT-5 is excellent
        cost: cost
      };
    } catch (error) {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      throw new Error(`GPT-5 CLI error: ${error.message}`);
    }
  }

  async callGeminiCLI(prompt, config) {
    // Use Gemini CLI with file input
    const fs = require('fs');
    const tmpFile = `/tmp/llm_prompt_${Date.now()}.txt`;

    try {
      fs.writeFileSync(tmpFile, prompt);
      const response = execSync(`cat "${tmpFile}" | gemini -p`, {
        encoding: 'utf-8',
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env }
      });

      fs.unlinkSync(tmpFile);

      // Clean up gemini output (remove loading messages)
      const cleaned = response.split('\n')
        .filter(line => !line.startsWith('Loaded') && line.trim().length > 0)
        .join('\n')
        .trim();

      return {
        content: cleaned,
        tokens_used: Math.ceil(cleaned.length / 4),
        confidence: 0.9,
        cost: (Math.ceil(cleaned.length / 4) / 1000000) * config.cost_per_1m_tokens
      };
    } catch (error) {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
      throw new Error(`Gemini CLI error: ${error.message}`);
    }
  }

  buildPrompt(task, context, llmName) {
    const llmConfig = this.config.llms[llmName];

    return `You are ${llmName}, part of a multi-LLM consortium working together.

YOUR STRENGTHS: ${llmConfig.strengths.join(', ')}

CONTEXT FROM UNIVERSAL MEMORY:
${context.recent_learnings.map(l => `- ${l.type}: ${l.content.slice(0, 200)}...`).join('\n')}

TASK: ${task}

INSTRUCTIONS:
1. Leverage your unique strengths (${llmConfig.strengths[0]})
2. Provide your best response
3. Note any uncertainties or areas where other LLMs might provide better insight
4. If you find new learnings, clearly mark them

RESPONSE:`;
  }

  // ===========================================
  // CONSENSUS BUILDING
  // ===========================================

  async buildConsensus(responses) {
    console.log('\n🤝 Building consensus...\n');

    // Filter successful responses
    const successfulResponses = responses.filter(r => r.success);

    if (successfulResponses.length === 0) {
      return {
        final_response: 'All LLMs failed to respond',
        learnings: [],
        confidence: 0
      };
    }

    // Extract common themes
    const consensus = {
      agreed_facts: this.findAgreement(successfulResponses),
      unique_insights: this.findUniqueContributions(successfulResponses),
      contradictions: this.findContradictions(successfulResponses),
      confidence: this.calculateConfidence(successfulResponses)
    };

    // Synthesize final response
    const finalResponse = this.synthesizeResponse(consensus, successfulResponses);

    // Extract learnings for memory
    const learnings = this.extractLearnings(successfulResponses);

    console.log(`   ✅ Consensus built (confidence: ${Math.round(consensus.confidence * 100)}%)`);
    console.log(`   📚 ${learnings.length} new learnings identified\n`);

    return {
      final_response: finalResponse,
      learnings: learnings,
      confidence: consensus.confidence,
      contributing_llms: successfulResponses.map(r => r.llm)
    };
  }

  findAgreement(responses) {
    // TODO: Implement semantic similarity analysis
    // For now, just note that all LLMs contributed
    return responses.map(r => r.llm).join(', ') + ' all contributed';
  }

  findUniqueContributions(responses) {
    // TODO: Identify insights that only one LLM provided
    return responses.map(r => ({
      llm: r.llm,
      unique_insight: 'Unique contribution from ' + r.llm
    }));
  }

  findContradictions(responses) {
    // TODO: Identify where LLMs disagree
    return [];
  }

  calculateConfidence(responses) {
    // Simple average of individual confidences
    const total = responses.reduce((sum, r) => sum + (r.response?.confidence || 0), 0);
    return total / responses.length;
  }

  synthesizeResponse(consensus, responses) {
    // TODO: Implement sophisticated response synthesis
    // For now, combine all responses
    return responses.map(r => `[${r.llm}]\n${r.response.content}`).join('\n\n---\n\n');
  }

  extractLearnings(responses) {
    // TODO: Use NLP to identify novel information
    return [
      {
        title: 'Multi-LLM Consensus Result',
        type: 'learning',
        content: `Consensus built from ${responses.length} LLMs`,
        source_llm: 'consortium',
        confidence: 0.9,
        tags: ['consortium', 'multi-llm']
      }
    ];
  }

  // ===========================================
  // STATS AND MONITORING
  // ===========================================

  updateStats(responses, consensus) {
    this.stats.tasks_executed++;

    // Track token usage and cost
    for (const response of responses) {
      if (response.success) {
        const llm = response.llm;
        this.stats.tokens_used[llm] = (this.stats.tokens_used[llm] || 0) + response.response.tokens_used;
        this.stats.total_cost += response.response.cost;
      }
    }

    // Save stats
    this.saveStats();
  }

  saveStats() {
    const statsFile = path.join(this.homeDir, '.claude', 'llm_consortium_stats.json');
    fs.writeFileSync(statsFile, JSON.stringify(this.stats, null, 2));
  }

  showStats() {
    console.log('\n📊 LLM Consortium Statistics\n');
    console.log(`Tasks executed: ${this.stats.tasks_executed}`);
    console.log(`Total cost: $${this.stats.total_cost.toFixed(2)}`);
    console.log('\nTokens used per LLM:');
    for (const [llm, tokens] of Object.entries(this.stats.tokens_used)) {
      console.log(`  ${llm}: ${tokens.toLocaleString()} tokens`);
    }
    console.log('');
  }
}

// CLI Interface
if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const orchestrator = new LLMConsortiumOrchestrator();

    if (args.includes('--stats')) {
      orchestrator.showStats();
      return;
    }

    if (args.includes('--help')) {
      console.log(`
LLM Consortium Orchestrator - Multi-LLM Collaboration System

Usage:
  node llm_consortium_orchestrator.cjs "task description" [--type task_type]
  node llm_consortium_orchestrator.cjs --stats
  node llm_consortium_orchestrator.cjs --help

Task Types:
  simple_tasks     - Single LLM (Claude)
  code_tasks       - Claude + GPT-4
  research_tasks   - Gemini + Perplexity
  complex_tasks    - All 4 LLMs (default)
  security_tasks   - Claude + Gemini + Perplexity
  ttx_generation   - Claude + Gemini + Perplexity

Examples:
  node llm_consortium_orchestrator.cjs "Generate TTX scenario for CGL"
  node llm_consortium_orchestrator.cjs "Optimize this algorithm" --type code_tasks
  node llm_consortium_orchestrator.cjs "Research LockBit 3.0 tactics" --type research_tasks
      `);
      return;
    }

    const taskDescription = args.find(a => !a.startsWith('--'));
    const typeArg = args.find(a => a.startsWith('--type'));
    const taskType = typeArg ? typeArg.split('=')[1] : 'complex_tasks';

    if (!taskDescription) {
      console.error('❌ Task description required');
      process.exit(1);
    }

    const result = await orchestrator.executeTask(taskDescription, taskType);

    console.log('\n🎉 FINAL RESULT:\n');
    console.log(result);
    console.log('\n');

    orchestrator.showStats();

  })().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = LLMConsortiumOrchestrator;
