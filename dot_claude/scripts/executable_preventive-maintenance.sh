#!/bin/bash
# PREVENTIVE MAINTENANCE - Run every 2 hours
# Prevents death loops BEFORE they start

check_and_clean() {
  # 1. Check .claude.json size FIRST (most critical)
  JSON_SIZE=$(du -m ~/.claude.json 2>/dev/null | cut -f1)
  if [ "$JSON_SIZE" -gt 2 ]; then
    echo "🚨 .claude.json BLOAT: ${JSON_SIZE}MB (trimming history)"
    bash ~/.claude/scripts/trim-claude-json.sh
  fi

  # 2. Check debug size
  DEBUG_SIZE=$(du -m ~/.claude/debug 2>/dev/null | cut -f1)
  if [ "$DEBUG_SIZE" -gt 30 ]; then
    echo "🚨 DEBUG BLOAT: ${DEBUG_SIZE}MB (deleting files >5MB)"
    find ~/.claude/debug -name "*.txt" -size +5M -delete 2>/dev/null
    find ~/.claude/debug -name "*.txt" -mtime +1 -delete 2>/dev/null
  fi

  # 3. Check file-history size
  HISTORY_SIZE=$(du -m ~/.claude/file-history 2>/dev/null | cut -f1)
  if [ "$HISTORY_SIZE" -gt 15 ]; then
    echo "🚨 FILE-HISTORY BLOAT: ${HISTORY_SIZE}MB (deleting >1 day old)"
    find ~/.claude/file-history -type f -mtime +1 -delete 2>/dev/null
  fi

  # 4. Check for zombie processes
  ZOMBIE_COUNT=$(ps aux | grep 'claude --dangerously' | grep -v grep | wc -l | tr -d ' ')
  if [ "$ZOMBIE_COUNT" -gt 3 ]; then
    echo "🚨 ZOMBIE PROCESSES: $ZOMBIE_COUNT (death loop risk)"
    echo "Run manually: killall -9 claude"
  fi

  # 5. Log status
  if [ "$DEBUG_SIZE" -lt 30 ] && [ "$HISTORY_SIZE" -lt 15 ] && [ "$JSON_SIZE" -lt 3 ]; then
    echo "$(date): ✅ Clean (JSON: ${JSON_SIZE}MB, Debug: ${DEBUG_SIZE}MB, History: ${HISTORY_SIZE}MB)" >> ~/.claude/maintenance.log
  fi
}

check_and_clean
