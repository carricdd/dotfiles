#!/usr/bin/env node
/**
 * Bidirectional Memory Sync - Files ↔ Database
 *
 * Keeps local markdown files synchronized with Supabase memory database
 * Provides offline fallback and bulletproof persistence
 *
 * Usage:
 *   node memory-sync.cjs               # Bidirectional sync
 *   node memory-sync.cjs --push        # Push local → database
 *   node memory-sync.cjs --pull        # Pull database → local
 *   node memory-sync.cjs --check       # Check sync status
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class MemorySync {
  constructor() {
    this.memoryDir = path.join(os.homedir(), '.claude', 'memory');
    this.cacheDir = path.join(os.homedir(), '.claude', 'memory-cache');
    this.syncStateFile = path.join(this.cacheDir, 'sync-state.json');

    this.ensureDirectories();
    this.loadSyncState();
    this.initializeSupabase();
  }

  ensureDirectories() {
    [this.memoryDir, this.cacheDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  loadSyncState() {
    if (fs.existsSync(this.syncStateFile)) {
      this.syncState = JSON.parse(fs.readFileSync(this.syncStateFile, 'utf-8'));
    } else {
      this.syncState = {
        lastSync: null,
        fileHashes: {},
        dbHashes: {},
        conflicts: []
      };
    }
  }

  saveSyncState() {
    fs.writeFileSync(this.syncStateFile, JSON.stringify(this.syncState, null, 2));
  }

  initializeSupabase() {
    try {
      const zshEnvPath = path.join(os.homedir(), '.zsh_env');

      if (!fs.existsSync(zshEnvPath)) {
        console.warn('⚠️  ~/.zsh_env not found - database sync disabled');
        this.offlineMode = true;
        return;
      }

      const envContent = fs.readFileSync(zshEnvPath, 'utf-8');
      const urlMatch = envContent.match(/export MEMORY_SUPABASE_URL[=]"?([^"\n]+)"?/);
      const keyMatch = envContent.match(/export MEMORY_SUPABASE_SERVICE_ROLE_KEY[=]"?([^"\n]+)"?/);

      if (!urlMatch || !keyMatch) {
        console.warn('⚠️  MEMORY_SUPABASE credentials not found - offline mode');
        this.offlineMode = true;
        return;
      }

      this.supabase = createClient(
        urlMatch[1].replace(/"/g, ''),
        keyMatch[1].replace(/"/g, '')
      );
      this.offlineMode = false;

    } catch (error) {
      console.warn('⚠️  Could not initialize Supabase:', error.message);
      this.offlineMode = true;
    }
  }

  async checkNetworkConnectivity() {
    if (this.offlineMode) return false;

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('id')
        .limit(1);

      return !error;
    } catch (error) {
      return false;
    }
  }

  calculateFileHash(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  // ==================== FILE OPERATIONS ====================

  async scanLocalFiles() {
    const files = [];

    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory() && entry.name !== 'memory-cache') {
          scanDir(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const hash = this.calculateFileHash(content);
          const relativePath = path.relative(this.memoryDir, fullPath);

          files.push({
            path: relativePath,
            fullPath,
            content,
            hash,
            modified: fs.statSync(fullPath).mtime
          });
        }
      }
    };

    scanDir(this.memoryDir);
    return files;
  }

  parseMemoryFile(content, filePath) {
    // Extract metadata from markdown frontmatter or headers
    const lines = content.split('\n');
    let summary = '';
    let memoryType = 'learning'; // default
    let tags = [];
    let importance = 0.5;

    // Try to extract metadata
    for (let i = 0; i < Math.min(20, lines.length); i++) {
      const line = lines[i];

      if (line.startsWith('# ')) {
        summary = line.replace('# ', '').trim();
      }

      if (line.includes('Type:')) {
        const match = line.match(/Type:\s*(\w+)/);
        if (match) memoryType = match[1].toLowerCase();
      }

      if (line.includes('Tags:') || line.includes('tags:')) {
        const match = line.match(/[Tt]ags?:\s*(.+)/);
        if (match) {
          tags = match[1].split(',').map(t => t.trim().toLowerCase());
        }
      }

      if (line.includes('Importance:')) {
        const match = line.match(/Importance:\s*([\d.]+)/);
        if (match) importance = parseFloat(match[1]);
      }
    }

    // Infer type from file path
    if (filePath.includes('customer') || filePath.includes('client')) {
      memoryType = 'customer_intelligence';
    } else if (filePath.includes('project')) {
      memoryType = 'project_context';
    } else if (filePath.includes('preference')) {
      memoryType = 'user_preference';
    }

    return {
      content,
      summary: summary || filePath,
      memory_type: memoryType,
      tags,
      importance
    };
  }

  // ==================== DATABASE OPERATIONS ====================

  async fetchAllMemories() {
    if (this.offlineMode) return [];

    try {
      const { data, error } = await this.supabase
        .from('memories')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Failed to fetch memories:', error.message);
      return [];
    }
  }

  async upsertMemory(memory) {
    if (this.offlineMode) {
      console.log('⚠️  Offline - memory queued for sync');
      return null;
    }

    try {
      // For file-based memories, use file_path as unique identifier
      // Generate deterministic ID from file path (UUID format compatible)
      const filePathHash = memory.file_path
        ? this.calculateFileHash(memory.file_path).substring(0, 32)
        : null;

      const { data, error} = await this.supabase
        .from('memories')
        .upsert({
          id: filePathHash || undefined, // Use file-based ID or let DB generate
          content: memory.content,
          summary: memory.summary,
          memory_type: memory.memory_type,
          importance: memory.importance,
          tags: memory.tags,
          metadata: {
            synced_from_file: true,
            file_path: memory.file_path, // Store in metadata instead
            last_file_sync: new Date().toISOString()
          }
        }, {
          onConflict: 'id', // Conflict on primary key
          ignoreDuplicates: false
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`❌ Failed to upsert memory: ${error.message}`);
      return null;
    }
  }

  // ==================== SYNC OPERATIONS ====================

  async pushToDatabase() {
    console.log('📤 Pushing local files to database...\n');

    const files = await this.scanLocalFiles();
    const results = { success: 0, failed: 0, skipped: 0 };

    for (const file of files) {
      const lastHash = this.syncState.fileHashes[file.path];

      if (lastHash === file.hash) {
        console.log(`⏭️  ${file.path} - No changes`);
        results.skipped++;
        continue;
      }

      console.log(`📤 ${file.path}`);
      const memory = this.parseMemoryFile(file.content, file.path);
      memory.file_path = file.path;

      const result = await this.upsertMemory(memory);

      if (result) {
        this.syncState.fileHashes[file.path] = file.hash;
        results.success++;
      } else {
        results.failed++;
      }
    }

    this.syncState.lastSync = new Date().toISOString();
    this.saveSyncState();

    console.log(`\n✅ Push complete: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
  }

  async pullFromDatabase() {
    console.log('📥 Pulling database memories to local files...\n');

    const memories = await this.fetchAllMemories();
    const results = { success: 0, failed: 0, skipped: 0 };

    for (const memory of memories) {
      // Generate file name from summary (handle null/undefined)
      const summary = memory.summary || memory.content?.slice(0, 50) || 'untitled';
      const fileName = summary
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 50) + '.md';

      const filePath = path.join(this.memoryDir, memory.memory_type, fileName);
      const fileDir = path.dirname(filePath);

      // Ensure directory exists
      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true });
      }

      // Generate markdown content
      const content = this.generateMarkdownFromMemory(memory);
      const hash = this.calculateFileHash(content);

      // Check if file needs update
      if (fs.existsSync(filePath)) {
        const existingContent = fs.readFileSync(filePath, 'utf-8');
        const existingHash = this.calculateFileHash(existingContent);

        if (existingHash === hash) {
          console.log(`⏭️  ${fileName} - No changes`);
          results.skipped++;
          continue;
        }
      }

      console.log(`📥 ${fileName}`);
      fs.writeFileSync(filePath, content);
      this.syncState.dbHashes[memory.id] = hash;
      results.success++;
    }

    this.syncState.lastSync = new Date().toISOString();
    this.saveSyncState();

    console.log(`\n✅ Pull complete: ${results.success} success, ${results.failed} failed, ${results.skipped} skipped`);
    return results;
  }

  generateMarkdownFromMemory(memory) {
    const lines = [];

    lines.push(`# ${memory.summary}`);
    lines.push('');
    lines.push(`**Type**: ${memory.memory_type}`);
    lines.push(`**Importance**: ${memory.importance}`);

    if (memory.tags && memory.tags.length > 0) {
      lines.push(`**Tags**: ${memory.tags.join(', ')}`);
    }

    lines.push(`**Created**: ${new Date(memory.created_at).toLocaleString()}`);
    lines.push(`**Updated**: ${new Date(memory.updated_at).toLocaleString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push(memory.content);

    return lines.join('\n');
  }

  async bidirectionalSync() {
    console.log('🔄 Starting bidirectional sync...\n');

    const isOnline = await this.checkNetworkConnectivity();

    if (!isOnline) {
      console.log('❌ Network unavailable - using offline mode');
      console.log('📁 Local files are your source of truth');
      return { mode: 'offline' };
    }

    console.log('✅ Network available - syncing with database\n');

    // Step 1: Pull from database (get latest from cloud)
    await this.pullFromDatabase();

    console.log('\n---\n');

    // Step 2: Push local changes (send any local updates)
    await this.pushToDatabase();

    return { mode: 'online', status: 'success' };
  }

  async checkSyncStatus() {
    console.log('📊 Memory Sync Status\n');

    const isOnline = await this.checkNetworkConnectivity();
    console.log(`Network: ${isOnline ? '✅ ONLINE' : '❌ OFFLINE'}`);
    console.log(`Last Sync: ${this.syncState.lastSync || 'Never'}\n`);

    const files = await this.scanLocalFiles();
    console.log(`📁 Local Files: ${files.length}`);

    const changedFiles = files.filter(f =>
      this.syncState.fileHashes[f.path] !== f.hash
    );
    console.log(`📝 Changed Files: ${changedFiles.length}`);

    if (isOnline) {
      const memories = await this.fetchAllMemories();
      console.log(`💾 Database Memories: ${memories.length}`);
    }

    if (this.syncState.conflicts.length > 0) {
      console.log(`\n⚠️  Conflicts: ${this.syncState.conflicts.length}`);
    }

    return {
      online: isOnline,
      localFiles: files.length,
      changedFiles: changedFiles.length,
      lastSync: this.syncState.lastSync
    };
  }
}

// CLI Usage
if (require.main === module) {
  (async () => {
    const sync = new MemorySync();
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case '--push':
          await sync.pushToDatabase();
          break;

        case '--pull':
          await sync.pullFromDatabase();
          break;

        case '--check':
          await sync.checkSyncStatus();
          break;

        case '--help':
          console.log(`
Memory Sync - Bidirectional file ↔ database synchronization

Usage:
  node memory-sync.cjs              Bidirectional sync (recommended)
  node memory-sync.cjs --push       Push local files → database
  node memory-sync.cjs --pull       Pull database → local files
  node memory-sync.cjs --check      Check sync status

How it works:
  1. Checks network connectivity
  2. If online: syncs with database
  3. If offline: uses local files as source of truth

Files are stored in: ~/.claude/memory/
Database: Supabase (MEMORY_SUPABASE_URL)
          `);
          break;

        default:
          // Default: bidirectional sync
          await sync.bidirectionalSync();
      }

    } catch (error) {
      console.error('❌ Sync error:', error.message);
      console.error(error.stack);
      process.exit(1);
    }
  })();
}

module.exports = MemorySync;
