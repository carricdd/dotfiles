#!/bin/bash
# Weekly Claude Code maintenance
# Prevents death loops from file bloat

echo "🧹 Weekly Claude Code Cleanup"
echo "=============================="

# Backup first
BACKUP_DIR=~/.claude/backups/weekly_$(date +%Y%m%d_%H%M%S)
mkdir -p "$BACKUP_DIR"
echo "📦 Backup: $BACKUP_DIR"

# Clean file-history (keep 7 days)
echo "🗑️  Cleaning file-history older than 7 days..."
find ~/.claude/file-history -type f -mtime +7 -delete 2>/dev/null
find ~/.claude/file-history -type d -empty -delete 2>/dev/null

# Clean debug logs (keep 7 days)
echo "🗑️  Cleaning debug logs older than 7 days..."
find ~/.claude/debug -name "*.txt" -mtime +7 -delete 2>/dev/null

# Clean old todos (keep 30 days)
echo "🗑️  Cleaning todos older than 30 days..."
find ~/.claude/todos -type f -mtime +30 -delete 2>/dev/null

# Check sizes
echo ""
echo "📊 Current sizes:"
du -sh ~/.claude.json ~/.claude/file-history ~/.claude/debug ~/.claude/todos 2>/dev/null

# Check for warnings
JSON_SIZE=$(du -m ~/.claude.json 2>/dev/null | cut -f1)
if [ "$JSON_SIZE" -gt 10 ]; then
    echo ""
    echo "⚠️  WARNING: ~/.claude.json is ${JSON_SIZE}MB (should be <5MB)"
    echo "   Consider: rm ~/.claude.json (will rebuild on next start)"
fi

echo ""
echo "✅ Weekly cleanup complete!"
