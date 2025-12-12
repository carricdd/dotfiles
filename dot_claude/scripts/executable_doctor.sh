#!/bin/bash
# Claude Code Health Check - Quick Diagnostic
# Run anytime to check Claude Code health
# Version: 1.0
# Created: 2025-10-25

echo "=========================================="
echo "Claude Code Health Check"
echo "$(date)"
echo "=========================================="
echo ""

# File sizes
echo "📊 Storage Usage:"
echo "-----------------------------------"
CLAUDE_JSON_SIZE=$(ls -lh ~/.claude.json 2>/dev/null | awk '{print $5}')
CLAUDE_JSON_BYTES=$(ls -l ~/.claude.json 2>/dev/null | awk '{print $5}')
TODO_SIZE=$(du -sh ~/.claude/todos 2>/dev/null | awk '{print $1}')
DEBUG_SIZE=$(du -sh ~/.claude/debug 2>/dev/null | awk '{print $1}')
FILE_HISTORY_SIZE=$(du -sh ~/.claude/file-history 2>/dev/null | awk '{print $1}')

# Health indicators
if [ "$CLAUDE_JSON_BYTES" -lt 5242880 ]; then  # 5MB
    JSON_STATUS="✅"
elif [ "$CLAUDE_JSON_BYTES" -lt 10485760 ]; then  # 10MB
    JSON_STATUS="⚠️ "
else
    JSON_STATUS="🚨"
fi

echo "  $JSON_STATUS ~/.claude.json: $CLAUDE_JSON_SIZE"
echo "     ~/.claude/todos: $TODO_SIZE"
echo "     ~/.claude/debug: $DEBUG_SIZE"
echo "     ~/.claude/file-history: $FILE_HISTORY_SIZE"
echo ""

# File counts
echo "📁 File Counts:"
echo "-----------------------------------"
TODO_COUNT=$(find ~/.claude/todos -type f 2>/dev/null | wc -l | tr -d ' ')
DEBUG_COUNT=$(find ~/.claude/debug -name "*.txt" 2>/dev/null | wc -l | tr -d ' ')
HISTORY_COUNT=$(find ~/.claude/file-history -type f 2>/dev/null | wc -l | tr -d ' ')

echo "  Todo files: $TODO_COUNT"
echo "  Debug logs: $DEBUG_COUNT"
echo "  File history: $HISTORY_COUNT"
echo ""

# Process check
echo "🔍 Process Status:"
echo "-----------------------------------"
CLAUDE_PROCESS_COUNT=$(ps aux | grep -i claude | grep -v grep | grep -v doctor.sh | wc -l | tr -d ' ')
echo "  Running Claude processes: $CLAUDE_PROCESS_COUNT"
if [ "$CLAUDE_PROCESS_COUNT" -gt 2 ]; then
    echo "  🚨 WARNING: Zombie processes detected!"
    echo ""
    echo "  Zombie shells:"
    ps aux | grep -E "claude-.*-cwd" | grep -v grep | awk '{print "    PID " $2 ": " $11 " " $12 " " $13}'
fi
echo ""

# Recent errors
echo "⚠️  Recent Errors (last 24h):"
echo "-----------------------------------"
ERROR_COUNT=$(find ~/.claude/debug -name "*.txt" -mtime -1 -exec grep -l "ERROR" {} \; 2>/dev/null | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "  Found errors in $ERROR_COUNT log files"
    echo ""
    echo "  Top 5 recent errors:"
    find ~/.claude/debug -name "*.txt" -mtime -1 -exec tail -50 {} \; 2>/dev/null | grep ERROR | tail -5 | sed 's/^/    /'
else
    echo "  ✅ No errors in last 24 hours"
fi
echo ""

# Overall health
echo "=========================================="
echo "Overall Health Assessment"
echo "=========================================="

HEALTH_SCORE=100

# Deduct points for issues
if [ "$CLAUDE_JSON_BYTES" -gt 5242880 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 20))
fi
if [ "$CLAUDE_JSON_BYTES" -gt 10485760 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 30))
fi
if [ "$CLAUDE_PROCESS_COUNT" -gt 2 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 25))
fi
if [ "$ERROR_COUNT" -gt 5 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 15))
fi
if [ "$TODO_COUNT" -gt 50 ]; then
    HEALTH_SCORE=$((HEALTH_SCORE - 10))
fi

# Display health score
if [ "$HEALTH_SCORE" -ge 90 ]; then
    echo "Health Score: ✅ EXCELLENT ($HEALTH_SCORE/100)"
    echo "Claude Code is running optimally."
elif [ "$HEALTH_SCORE" -ge 70 ]; then
    echo "Health Score: ⚠️  GOOD ($HEALTH_SCORE/100)"
    echo "Minor issues detected. Consider running cleanup."
elif [ "$HEALTH_SCORE" -ge 50 ]; then
    echo "Health Score: ⚠️  WARNING ($HEALTH_SCORE/100)"
    echo "Issues detected. Run: bash ~/.claude/scripts/nightly-maintenance.sh"
else
    echo "Health Score: 🚨 CRITICAL ($HEALTH_SCORE/100)"
    echo "Serious issues detected. Run maintenance NOW:"
    echo "  bash ~/.claude/scripts/nightly-maintenance.sh"
    echo ""
    echo "Then close all Claude terminals and restart."
fi

echo ""
echo "=========================================="
echo ""
echo "Run full maintenance:"
echo "  bash ~/.claude/scripts/nightly-maintenance.sh"
echo ""

exit 0
