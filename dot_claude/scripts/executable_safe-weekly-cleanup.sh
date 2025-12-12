#!/bin/bash
# Safe Weekly Claude Code Cleanup
# Prevents death loops WITHOUT killing active sessions
# Run weekly via cron or manually
# Created: 2025-10-15

set -e

echo "🧹 Safe Weekly Claude Code Cleanup"
echo "===================================="
echo ""

# Check for active Claude sessions
ACTIVE_SESSIONS=$(ps aux | grep "claude --dangerously" | grep -v grep | wc -l)
echo "📊 Active Claude sessions: $ACTIVE_SESSIONS"

if [ "$ACTIVE_SESSIONS" -gt 0 ]; then
    echo "⚠️  Active sessions detected - using conservative cleanup"
    DAYS_OLD=14  # More conservative when sessions running
else
    echo "✅ No active sessions - using aggressive cleanup"
    DAYS_OLD=7   # More aggressive when nothing running
fi

echo ""
echo "📊 Current sizes:"
du -sh ~/.claude.json ~/.claude/todos ~/.claude/debug ~/.claude/file-history 2>/dev/null

# Check for warnings
CLAUDE_JSON_SIZE=$(stat -f%z ~/.claude.json 2>/dev/null || echo 0)
if [ "$CLAUDE_JSON_SIZE" -gt 5000000 ]; then
    echo "⚠️  WARNING: .claude.json is >5MB ($((CLAUDE_JSON_SIZE / 1024 / 1024))MB)"
    echo "   Consider running emergency cleanup when all sessions closed"
fi

echo ""

# Clean old todos (>30 days always safe)
echo "🧹 Cleaning todos older than 30 days..."
DELETED_TODOS=$(find ~/.claude/todos -name "*.json" -mtime +30 -print 2>/dev/null | wc -l)
find ~/.claude/todos -name "*.json" -mtime +30 -delete 2>/dev/null || true
echo "   Deleted $DELETED_TODOS todo files"

# Clean old debug (variable based on active sessions)
echo "🧹 Cleaning debug files older than $DAYS_OLD days..."
DELETED_DEBUG=$(find ~/.claude/debug -name "*.txt" -mtime +$DAYS_OLD -print 2>/dev/null | wc -l)
find ~/.claude/debug -name "*.txt" -mtime +$DAYS_OLD -delete 2>/dev/null || true
echo "   Deleted $DELETED_DEBUG debug files"

# Clean old file-history (variable based on active sessions)
echo "🧹 Cleaning file-history older than $DAYS_OLD days..."
DELETED_HISTORY=$(find ~/.claude/file-history -type f -mtime +$DAYS_OLD -print 2>/dev/null | wc -l)
find ~/.claude/file-history -type f -mtime +$DAYS_OLD -delete 2>/dev/null || true
echo "   Deleted $DELETED_HISTORY history files"

# Clean empty directories
find ~/.claude/file-history -type d -empty -delete 2>/dev/null || true

# Clean old shell snapshots (these are safe to remove)
if [ -d ~/.claude/shell-snapshots ]; then
    echo "🧹 Cleaning shell snapshots older than 7 days..."
    DELETED_SNAPSHOTS=$(find ~/.claude/shell-snapshots -type f -mtime +7 -print 2>/dev/null | wc -l)
    find ~/.claude/shell-snapshots -type f -mtime +7 -delete 2>/dev/null || true
    echo "   Deleted $DELETED_SNAPSHOTS snapshot files"
fi

echo ""
echo "📊 After cleanup:"
du -sh ~/.claude.json ~/.claude/todos ~/.claude/debug ~/.claude/file-history 2>/dev/null

echo ""
echo "✅ Safe cleanup complete!"
echo ""

# Check if still too large
NEW_SIZE=$(stat -f%z ~/.claude.json 2>/dev/null || echo 0)
if [ "$NEW_SIZE" -gt 10000000 ]; then
    echo "⚠️  CRITICAL: .claude.json is still >10MB!"
    echo "   When all Claude sessions are closed, run:"
    echo "   bash ~/Projects/cloudraider/CloudRaider-Portal/scripts/EMERGENCY_CLEANUP.sh"
fi

# Summary
echo ""
echo "💡 Next cleanup: $(date -v+7d '+%Y-%m-%d')"
echo "   Or run manually: bash ~/.claude/scripts/safe-weekly-cleanup.sh"
