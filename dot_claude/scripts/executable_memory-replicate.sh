#!/bin/bash
##
## Memory Multi-Node Replication
## Syncs ~/.claude/memory across all configured nodes
##

MEMORY_DIR=~/.claude/memory
LOG_FILE=~/.claude/logs/memory-replication.log
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Ensure log directory exists
mkdir -p ~/.claude/logs

log() {
  echo "[$TIMESTAMP] $1" >> "$LOG_FILE"
  echo -e "$2$1${NC}"
}

# Check if memory directory exists
if [ ! -d "$MEMORY_DIR" ]; then
  log "❌ Memory directory not found: $MEMORY_DIR" "$RED"
  exit 1
fi

log "🔄 Starting memory replication..." "$GREEN"

# Count local files
LOCAL_COUNT=$(find "$MEMORY_DIR" -name "*.md" | wc -l)
log "📁 Local files: $LOCAL_COUNT" ""

# ==================== SYNC TO MAC00 ====================
sync_to_mac00() {
  log "🔄 Syncing to Mac00..." "$YELLOW"

  if ssh -q carric@mac00.local exit; then
    # Ensure remote directory exists
    ssh carric@mac00.local "mkdir -p ~/.claude/memory"

    # Sync files
    if rsync -avz --delete "$MEMORY_DIR/" carric@mac00.local:~/.claude/memory/ >> "$LOG_FILE" 2>&1; then
      REMOTE_COUNT=$(ssh carric@mac00.local "find ~/.claude/memory -name '*.md' | wc -l")
      log "✅ Mac00: Synced $REMOTE_COUNT files" "$GREEN"
      return 0
    else
      log "❌ Mac00: Sync failed" "$RED"
      return 1
    fi
  else
    log "⚠️  Mac00: Not reachable (offline or not configured)" "$YELLOW"
    return 1
  fi
}

# ==================== SYNC TO GITHUB ====================
sync_to_github() {
  log "🔄 Syncing to GitHub..." "$YELLOW"

  cd "$MEMORY_DIR" || exit

  # Initialize git if not already done
  if [ ! -d .git ]; then
    log "🔧 Initializing Git repository..." ""
    git init >> "$LOG_FILE" 2>&1

    # Check if remote exists
    if git remote get-url origin &>/dev/null; then
      log "✅ Git remote already configured" ""
    else
      log "⚠️  Git remote not configured - skipping GitHub sync" "$YELLOW"
      log "   Run: cd ~/.claude/memory && git remote add origin YOUR_REPO_URL" ""
      return 1
    fi
  fi

  # Add all files
  git add . >> "$LOG_FILE" 2>&1

  # Commit if there are changes
  if git diff --staged --quiet; then
    log "⏭️  GitHub: No changes to commit" ""
    return 0
  else
    git commit -m "Memory sync: $(date)" >> "$LOG_FILE" 2>&1

    # Push to remote
    if git push -u origin main >> "$LOG_FILE" 2>&1; then
      log "✅ GitHub: Pushed successfully" "$GREEN"
      return 0
    else
      log "❌ GitHub: Push failed (check ~/.claude/logs/memory-replication.log)" "$RED"
      return 1
    fi
  fi
}

# ==================== SYNC TO SUPABASE ====================
sync_to_supabase() {
  log "🔄 Syncing to Supabase..." "$YELLOW"

  if node ~/.claude/scripts/memory-sync.cjs --push >> "$LOG_FILE" 2>&1; then
    log "✅ Supabase: Synced successfully" "$GREEN"
    return 0
  else
    log "❌ Supabase: Sync failed" "$RED"
    return 1
  fi
}

# ==================== RUN ALL SYNCS ====================
SUCCESS=0
FAILED=0

sync_to_mac00 && ((SUCCESS++)) || ((FAILED++))
sync_to_github && ((SUCCESS++)) || ((FAILED++))
sync_to_supabase && ((SUCCESS++)) || ((FAILED++))

# ==================== SUMMARY ====================
echo ""
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "$GREEN"
log "   Multi-Node Replication Complete" "$GREEN"
log "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "$GREEN"
log "   Success: $SUCCESS replicas" ""
log "   Failed:  $FAILED replicas" ""

if [ $SUCCESS -eq 0 ]; then
  log "   Status: 🚨 CRITICAL - No replicas synced!" "$RED"
  exit 1
elif [ $FAILED -gt 0 ]; then
  log "   Status: ⚠️  WARNING - Partial sync" "$YELLOW"
  exit 0
else
  log "   Status: ✅ All replicas synced" "$GREEN"
  exit 0
fi
