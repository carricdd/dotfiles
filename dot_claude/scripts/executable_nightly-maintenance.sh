#!/bin/bash
# Claude Code Nightly Maintenance System
# Runs at 0200 daily to prevent death loops and maintain optimal performance
# Version: 2.0
# Created: 2025-10-25
# Updated: 2025-12-06 - Added JSONL conversation cleanup, history trimming, shell-snapshots

TIMESTAMP=$(date '+%Y-%m-%d_%H-%M-%S')
LOG_DIR="$HOME/.claude/maintenance-logs"
LOG_FILE="$LOG_DIR/maintenance-$TIMESTAMP.log"
BACKUP_DIR="$HOME/.claude/backups/nightly"

# Create directories if they don't exist
mkdir -p "$LOG_DIR" "$BACKUP_DIR"

# Redirect all output to log file
exec > >(tee -a "$LOG_FILE") 2>&1

echo "=========================================="
echo "Claude Code Nightly Maintenance"
echo "Started: $(date)"
echo "=========================================="
echo ""

# =====================================
# PHASE 1: DIAGNOSTICS
# =====================================
echo "PHASE 1: Running Diagnostics..."
echo "-----------------------------------"

# Check file sizes
echo "File Size Check:"
CLAUDE_JSON_SIZE=$(ls -lh ~/.claude.json 2>/dev/null | awk '{print $5}')
TODO_SIZE=$(du -sh ~/.claude/todos 2>/dev/null | awk '{print $1}')
DEBUG_SIZE=$(du -sh ~/.claude/debug 2>/dev/null | awk '{print $1}')
FILE_HISTORY_SIZE=$(du -sh ~/.claude/file-history 2>/dev/null | awk '{print $1}')

PROJECTS_SIZE=$(du -sh ~/.claude/projects 2>/dev/null | awk '{print $1}')
HISTORY_JSONL_SIZE=$(ls -lh ~/.claude/history.jsonl 2>/dev/null | awk '{print $5}')
SHELL_SNAPSHOTS_SIZE=$(du -sh ~/.claude/shell-snapshots 2>/dev/null | awk '{print $1}')

echo "  ~/.claude.json: $CLAUDE_JSON_SIZE"
echo "  ~/.claude/todos: $TODO_SIZE"
echo "  ~/.claude/debug: $DEBUG_SIZE"
echo "  ~/.claude/file-history: $FILE_HISTORY_SIZE"
echo "  ~/.claude/projects: $PROJECTS_SIZE"
echo "  ~/.claude/history.jsonl: $HISTORY_JSONL_SIZE"
echo "  ~/.claude/shell-snapshots: $SHELL_SNAPSHOTS_SIZE"
echo ""

# Count files
TODO_COUNT=$(find ~/.claude/todos -type f 2>/dev/null | wc -l | tr -d ' ')
DEBUG_COUNT=$(find ~/.claude/debug -name "*.txt" 2>/dev/null | wc -l | tr -d ' ')
HISTORY_COUNT=$(find ~/.claude/file-history -type f 2>/dev/null | wc -l | tr -d ' ')

echo "File Counts:"
echo "  Todo files: $TODO_COUNT"
echo "  Debug logs: $DEBUG_COUNT"
echo "  File history: $HISTORY_COUNT"
echo ""

# Check for zombie processes
CLAUDE_PROCESS_COUNT=$(ps aux | grep -i claude | grep -v grep | wc -l | tr -d ' ')
echo "Running Claude processes: $CLAUDE_PROCESS_COUNT"
if [ "$CLAUDE_PROCESS_COUNT" -gt 2 ]; then
    echo "  ⚠️  WARNING: More than 2 Claude processes detected (zombie processes likely)"
fi
echo ""

# Check for recent errors
ERROR_COUNT=$(find ~/.claude/debug -name "*.txt" -mtime -1 -exec grep -l "ERROR" {} \; 2>/dev/null | wc -l | tr -d ' ')
echo "Debug logs with errors (last 24h): $ERROR_COUNT"
if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "  ⚠️  WARNING: High error count detected"
    echo "  Recent errors:"
    find ~/.claude/debug -name "*.txt" -mtime -1 -exec tail -5 {} \; 2>/dev/null | grep ERROR | tail -10 | sed 's/^/    /'
fi
echo ""

# =====================================
# PHASE 2: BACKUP
# =====================================
echo "PHASE 2: Creating Backups..."
echo "-----------------------------------"

# Backup .claude.json
if [ -f "$HOME/.claude.json" ]; then
    cp "$HOME/.claude.json" "$BACKUP_DIR/claude.json.$TIMESTAMP"
    echo "✅ Backed up .claude.json"
else
    echo "⚠️  .claude.json not found"
fi

# Backup recent todos (last 7 days)
TODO_BACKUP="$BACKUP_DIR/todos-$TIMESTAMP"
mkdir -p "$TODO_BACKUP"
find ~/.claude/todos -type f -mtime -7 -exec cp {} "$TODO_BACKUP/" \; 2>/dev/null
TODO_BACKUP_COUNT=$(ls "$TODO_BACKUP" 2>/dev/null | wc -l | tr -d ' ')
echo "✅ Backed up $TODO_BACKUP_COUNT recent todo files"
echo ""

# =====================================
# PHASE 3: CLEANUP
# =====================================
echo "PHASE 3: Cleaning Up Bloat..."
echo "-----------------------------------"

# Clean old todo files (>1 day) - Database has real data, todos are ephemeral
OLD_TODOS=$(find ~/.claude/todos -type f -mtime +1 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_TODOS" -gt 0 ]; then
    find ~/.claude/todos -type f -mtime +1 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_TODOS old todo files (>1 day)"
else
    echo "✅ No old todo files to delete"
fi

# Clean old debug logs (>1 day) - Incredibly verbose, bloat every day
OLD_DEBUG=$(find ~/.claude/debug -name "*.txt" -mtime +1 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_DEBUG" -gt 0 ]; then
    find ~/.claude/debug -name "*.txt" -mtime +1 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_DEBUG old debug logs (>1 day)"
else
    echo "✅ No old debug logs to delete"
fi

# Clean old file history (>1 day) - Database has intelligence, this is just LLM bloat
OLD_HISTORY=$(find ~/.claude/file-history -type f -mtime +1 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_HISTORY" -gt 0 ]; then
    find ~/.claude/file-history -type f -mtime +1 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_HISTORY old file history entries (>1 day)"
else
    echo "✅ No old file history to delete"
fi

# Clean old maintenance logs (>30 days)
OLD_LOGS=$(find "$LOG_DIR" -name "maintenance-*.log" -mtime +30 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_LOGS" -gt 0 ]; then
    find "$LOG_DIR" -name "maintenance-*.log" -mtime +30 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_LOGS old maintenance logs (>30 days)"
else
    echo "✅ No old maintenance logs to delete"
fi

# Clean old backups (>60 days)
OLD_BACKUPS=$(find "$BACKUP_DIR" -type f -mtime +60 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_BACKUPS" -gt 0 ]; then
    find "$BACKUP_DIR" -type f -mtime +60 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_BACKUPS old backups (>60 days)"
else
    echo "✅ No old backups to delete"
fi

# Clean old conversation JSONL files (>14 days) - THE BIG BLOAT CULPRIT
OLD_CONVERSATIONS=$(find ~/.claude/projects -name "*.jsonl" -mtime +14 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_CONVERSATIONS" -gt 0 ]; then
    CONV_SIZE_BEFORE=$(du -sh ~/.claude/projects 2>/dev/null | awk '{print $1}')
    find ~/.claude/projects -name "*.jsonl" -mtime +14 -delete 2>/dev/null
    find ~/.claude/projects -type d -empty -delete 2>/dev/null
    CONV_SIZE_AFTER=$(du -sh ~/.claude/projects 2>/dev/null | awk '{print $1}')
    echo "🗑️  Deleted $OLD_CONVERSATIONS old conversation files (>14 days)"
    echo "    projects/ size: $CONV_SIZE_BEFORE -> $CONV_SIZE_AFTER"
else
    echo "✅ No old conversation files to delete"
fi

# Trim history.jsonl to last 1000 entries if it's getting large
HISTORY_LINES=$(wc -l < ~/.claude/history.jsonl 2>/dev/null | tr -d ' ')
if [ "$HISTORY_LINES" -gt 2000 ]; then
    tail -1000 ~/.claude/history.jsonl > ~/.claude/history.jsonl.tmp
    mv ~/.claude/history.jsonl.tmp ~/.claude/history.jsonl
    echo "🗑️  Trimmed history.jsonl from $HISTORY_LINES to 1000 entries"
else
    echo "✅ history.jsonl size OK ($HISTORY_LINES entries)"
fi

# Clean old shell-snapshots (>7 days)
OLD_SNAPSHOTS=$(find ~/.claude/shell-snapshots -type f -mtime +7 2>/dev/null | wc -l | tr -d ' ')
if [ "$OLD_SNAPSHOTS" -gt 0 ]; then
    find ~/.claude/shell-snapshots -type f -mtime +7 -delete 2>/dev/null
    echo "🗑️  Deleted $OLD_SNAPSHOTS old shell snapshots (>7 days)"
else
    echo "✅ No old shell snapshots to delete"
fi

echo ""

# =====================================
# PHASE 4: LOG ROTATION
# =====================================
echo "PHASE 4: Rotating Logs..."
echo "-----------------------------------"

# Compress old debug logs (>1 day, not already compressed)
LOGS_TO_COMPRESS=$(find ~/.claude/debug -name "*.txt" -mtime +1 ! -name "*.gz" 2>/dev/null | wc -l | tr -d ' ')
if [ "$LOGS_TO_COMPRESS" -gt 0 ]; then
    find ~/.claude/debug -name "*.txt" -mtime +1 ! -name "*.gz" -exec gzip {} \; 2>/dev/null
    echo "📦 Compressed $LOGS_TO_COMPRESS debug logs"
else
    echo "✅ No logs to compress"
fi
echo ""

# =====================================
# PHASE 5: PROCESS CLEANUP
# =====================================
echo "PHASE 5: Process Cleanup..."
echo "-----------------------------------"

# Kill zombie shell processes (but not active claude sessions)
ZOMBIE_SHELLS=$(ps aux | grep -E "claude-.*-cwd" | grep -v grep | wc -l | tr -d ' ')
if [ "$ZOMBIE_SHELLS" -gt 0 ]; then
    ps aux | grep -E "claude-.*-cwd" | grep -v grep | awk '{print $2}' | xargs kill 2>/dev/null
    echo "🔪 Killed $ZOMBIE_SHELLS zombie shell processes"
else
    echo "✅ No zombie shell processes found"
fi
echo ""

# =====================================
# PHASE 6: HEALTH REPORT
# =====================================
echo "PHASE 6: Post-Cleanup Health Report..."
echo "-----------------------------------"

# Recalculate sizes
CLAUDE_JSON_SIZE_AFTER=$(ls -lh ~/.claude.json 2>/dev/null | awk '{print $5}')
TODO_SIZE_AFTER=$(du -sh ~/.claude/todos 2>/dev/null | awk '{print $1}')
DEBUG_SIZE_AFTER=$(du -sh ~/.claude/debug 2>/dev/null | awk '{print $1}')
FILE_HISTORY_SIZE_AFTER=$(du -sh ~/.claude/file-history 2>/dev/null | awk '{print $1}')

echo "After Cleanup:"
echo "  ~/.claude.json: $CLAUDE_JSON_SIZE_AFTER"
echo "  ~/.claude/todos: $TODO_SIZE_AFTER"
echo "  ~/.claude/debug: $DEBUG_SIZE_AFTER"
echo "  ~/.claude/file-history: $FILE_HISTORY_SIZE_AFTER"
echo ""

# Health status
echo "Health Status:"

# Check .claude.json size (convert to MB for comparison)
JSON_SIZE_MB=$(ls -l ~/.claude.json 2>/dev/null | awk '{print $5/1024/1024}')
if (( $(echo "$JSON_SIZE_MB < 5" | bc -l) )); then
    echo "  ✅ .claude.json size: HEALTHY ($CLAUDE_JSON_SIZE_AFTER)"
elif (( $(echo "$JSON_SIZE_MB < 10" | bc -l) )); then
    echo "  ⚠️  .claude.json size: WARNING ($CLAUDE_JSON_SIZE_AFTER)"
else
    echo "  🚨 .claude.json size: CRITICAL ($CLAUDE_JSON_SIZE_AFTER)"
fi

# Check file-history (parse size for comparison)
HISTORY_SIZE_NUM=$(echo $FILE_HISTORY_SIZE_AFTER | sed 's/[^0-9.]//g')
HISTORY_SIZE_UNIT=$(echo $FILE_HISTORY_SIZE_AFTER | sed 's/[0-9.]//g')
if [[ "$HISTORY_SIZE_UNIT" == "M" ]] && (( $(echo "$HISTORY_SIZE_NUM < 20" | bc -l) )); then
    echo "  ✅ file-history size: HEALTHY ($FILE_HISTORY_SIZE_AFTER)"
elif [[ "$HISTORY_SIZE_UNIT" == "K" ]]; then
    echo "  ✅ file-history size: HEALTHY ($FILE_HISTORY_SIZE_AFTER)"
else
    echo "  ⚠️  file-history size: WARNING ($FILE_HISTORY_SIZE_AFTER)"
fi

# Check process count
if [ "$CLAUDE_PROCESS_COUNT" -le 2 ]; then
    echo "  ✅ Process count: HEALTHY ($CLAUDE_PROCESS_COUNT)"
else
    echo "  ⚠️  Process count: WARNING ($CLAUDE_PROCESS_COUNT)"
fi

echo ""

# =====================================
# SUMMARY
# =====================================
echo "=========================================="
echo "Maintenance Summary"
echo "=========================================="
echo "Started:  $(date -r $(stat -f%B "$LOG_FILE") '+%Y-%m-%d %H:%M:%S')"
echo "Finished: $(date)"
echo ""
echo "Actions Taken:"
echo "  - Backed up .claude.json and recent todos"
echo "  - Deleted $OLD_TODOS old todo files"
echo "  - Deleted $OLD_DEBUG old debug logs"
echo "  - Deleted $OLD_HISTORY old file history entries"
echo "  - Compressed $LOGS_TO_COMPRESS log files"
echo "  - Killed $ZOMBIE_SHELLS zombie processes"
echo ""
echo "Log saved to: $LOG_FILE"
echo "=========================================="
echo ""

# Return success
exit 0
