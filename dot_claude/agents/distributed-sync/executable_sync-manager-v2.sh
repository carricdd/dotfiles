#!/bin/bash

# Distributed Computing Sync Manager V2
# Simplified version for macOS compatibility

set -euo pipefail

# Configuration
SYNC_CONFIG_DIR="$HOME/.claude/agents/distributed-sync"
SYNC_STATE_FILE="$SYNC_CONFIG_DIR/sync.state"
SYNC_LOG="$SYNC_CONFIG_DIR/sync.log"
REMOTE_HOST="mac00"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$1] ${*:2}" | tee -a "$SYNC_LOG"
}

# Initialize
init_sync() {
    log "INFO" "Initializing sync environment..."

    mkdir -p "$SYNC_CONFIG_DIR"
    mkdir -p "$HOME/.ssh/controlmasters"
    touch "$SYNC_STATE_FILE" "$SYNC_LOG"

    # Create sync paths file
    cat > "$SYNC_CONFIG_DIR/paths.txt" <<EOF
cloudraider:$HOME/CloudRaider
claude_agents:$HOME/.claude/agents
projects:$HOME/projects
EOF

    log "INFO" "Sync environment initialized"
}

# Push sync
push_sync() {
    log "INFO" "Starting push sync to $REMOTE_HOST..."

    while IFS=: read -r name path; do
        if [[ -d "$path" ]]; then
            log "INFO" "Syncing $name: $path"

            rsync -avz --delete \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                --exclude='*.pyc' \
                --exclude='.DS_Store' \
                --exclude='.venv' \
                "$path/" "$REMOTE_HOST:$path/" 2>&1 | tee -a "$SYNC_LOG"
        fi
    done < "$SYNC_CONFIG_DIR/paths.txt"

    log "INFO" "Push sync completed"
}

# Pull sync
pull_sync() {
    log "INFO" "Starting pull sync from $REMOTE_HOST..."

    while IFS=: read -r name path; do
        if ssh "$REMOTE_HOST" "test -d '$path'" 2>/dev/null; then
            log "INFO" "Pulling $name: $path"

            mkdir -p "$path"
            rsync -avz --delete \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                "$REMOTE_HOST:$path/" "$path/" 2>&1 | tee -a "$SYNC_LOG"
        fi
    done < "$SYNC_CONFIG_DIR/paths.txt"

    log "INFO" "Pull sync completed"
}

# Bidirectional sync
bidirectional_sync() {
    log "INFO" "Starting bidirectional sync..."

    while IFS=: read -r name path; do
        if [[ -d "$path" ]]; then
            # Push newer local files
            rsync -avzu --update \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                "$path/" "$REMOTE_HOST:$path/"

            # Pull newer remote files
            rsync -avzu --update \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                "$REMOTE_HOST:$path/" "$path/"
        fi
    done < "$SYNC_CONFIG_DIR/paths.txt"

    touch "$SYNC_STATE_FILE"
    log "INFO" "Bidirectional sync completed"
}

# Start real-time sync
start_realtime() {
    log "INFO" "Starting real-time sync..."

    # Stop existing watchers
    stop_realtime

    # Create watcher script
    cat > "$SYNC_CONFIG_DIR/watcher.sh" <<'WATCHER'
#!/bin/bash

SYNC_CONFIG_DIR="$HOME/.claude/agents/distributed-sync"
REMOTE_HOST="mac00"

# Watch CloudRaider
if [[ -d "$HOME/CloudRaider" ]]; then
    fswatch -0 -r -l 0.5 \
        --exclude "\.git" \
        --exclude "node_modules" \
        --exclude "__pycache__" \
        "$HOME/CloudRaider" | while read -d "" event; do

        rsync -az "$event" "$REMOTE_HOST:$event" 2>/dev/null || true
        echo "$(date '+%H:%M:%S') Synced: ${event#$HOME/}" >> "$SYNC_CONFIG_DIR/realtime.log"
    done &
    echo $! >> "$SYNC_CONFIG_DIR/watcher.pids"
fi

# Watch claude agents
if [[ -d "$HOME/.claude/agents" ]]; then
    fswatch -0 -r -l 0.5 \
        --exclude "\.git" \
        --exclude "\.log" \
        "$HOME/.claude/agents" | while read -d "" event; do

        rsync -az "$event" "$REMOTE_HOST:$event" 2>/dev/null || true
        echo "$(date '+%H:%M:%S') Synced: ${event#$HOME/}" >> "$SYNC_CONFIG_DIR/realtime.log"
    done &
    echo $! >> "$SYNC_CONFIG_DIR/watcher.pids"
fi

wait
WATCHER

    chmod +x "$SYNC_CONFIG_DIR/watcher.sh"

    # Clear PID file
    > "$SYNC_CONFIG_DIR/watcher.pids"

    # Start watcher
    nohup "$SYNC_CONFIG_DIR/watcher.sh" > "$SYNC_CONFIG_DIR/watcher.log" 2>&1 &
    echo $! > "$SYNC_CONFIG_DIR/main_watcher.pid"

    log "INFO" "Real-time sync started (PID: $(cat "$SYNC_CONFIG_DIR/main_watcher.pid"))"
}

# Stop real-time sync
stop_realtime() {
    log "INFO" "Stopping real-time sync..."

    # Kill main watcher
    if [[ -f "$SYNC_CONFIG_DIR/main_watcher.pid" ]]; then
        kill $(cat "$SYNC_CONFIG_DIR/main_watcher.pid") 2>/dev/null || true
        rm "$SYNC_CONFIG_DIR/main_watcher.pid"
    fi

    # Kill child watchers
    if [[ -f "$SYNC_CONFIG_DIR/watcher.pids" ]]; then
        while read pid; do
            kill $pid 2>/dev/null || true
        done < "$SYNC_CONFIG_DIR/watcher.pids"
        rm "$SYNC_CONFIG_DIR/watcher.pids"
    fi

    log "INFO" "Real-time sync stopped"
}

# Session handoff
handoff() {
    case "${1:-save}" in
        save)
            pwd > "$SYNC_CONFIG_DIR/session.cwd"
            if ls "$SYNC_CONFIG_DIR"/session.* 2>/dev/null | grep -q .; then
                rsync -az "$SYNC_CONFIG_DIR"/session.* "$REMOTE_HOST:$SYNC_CONFIG_DIR/"
            fi
            echo "Session saved and synced"
            ;;
        restore|connect)
            ssh -t "$REMOTE_HOST" 'cd $(cat ~/.claude/agents/distributed-sync/session.cwd 2>/dev/null || echo ~); exec $SHELL'
            ;;
    esac
}

# Show status
show_status() {
    echo -e "${BLUE}=== Distributed Sync Status ===${NC}"

    # Check real-time sync
    if [[ -f "$SYNC_CONFIG_DIR/main_watcher.pid" ]]; then
        pid=$(cat "$SYNC_CONFIG_DIR/main_watcher.pid")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Real-time sync: Running (PID: $pid)"
        else
            echo -e "${RED}✗${NC} Real-time sync: Stopped"
        fi
    else
        echo -e "${YELLOW}○${NC} Real-time sync: Not running"
    fi

    # Show sync paths
    echo -e "\n${BLUE}Synchronized Paths:${NC}"
    while IFS=: read -r name path; do
        if [[ -d "$path" ]]; then
            size=$(du -sh "$path" 2>/dev/null | cut -f1)
            echo -e "  ${GREEN}✓${NC} $name: $path ($size)"
        else
            echo -e "  ${RED}✗${NC} $name: $path (not found)"
        fi
    done < "$SYNC_CONFIG_DIR/paths.txt"

    # Recent activity
    if [[ -f "$SYNC_CONFIG_DIR/realtime.log" ]]; then
        echo -e "\n${BLUE}Recent Activity:${NC}"
        tail -5 "$SYNC_CONFIG_DIR/realtime.log" | sed 's/^/  /'
    fi
}

# Main interface
case "${1:-help}" in
    init)
        init_sync
        ;;
    start)
        init_sync
        push_sync
        start_realtime
        echo -e "${GREEN}✓${NC} Distributed sync started"
        ;;
    stop)
        stop_realtime
        ;;
    push)
        push_sync
        ;;
    pull)
        pull_sync
        ;;
    sync)
        bidirectional_sync
        ;;
    handoff)
        shift
        handoff "$@"
        ;;
    status)
        show_status
        ;;
    logs)
        tail -f "$SYNC_LOG"
        ;;
    help|*)
        cat <<EOF
Distributed Sync Manager V2

Usage: $0 <command>

Commands:
  init      Initialize sync environment
  start     Start full synchronization
  stop      Stop real-time sync
  push      Push local changes to remote
  pull      Pull remote changes to local
  sync      Bidirectional sync
  handoff   Session handoff [save|connect]
  status    Show sync status
  logs      Show sync logs

Examples:
  $0 start           # Start sync system
  $0 status          # Check status
  $0 handoff save    # Save session
  $0 handoff connect # Connect to remote

EOF
        ;;
esac