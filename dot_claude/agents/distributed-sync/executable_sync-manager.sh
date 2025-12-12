#!/bin/bash

# Distributed Computing Sync Manager
# Provides seamless bidirectional synchronization between hosts

set -euo pipefail

# Configuration
SYNC_CONFIG_DIR="$HOME/.claude/agents/distributed-sync"
SYNC_STATE_FILE="$SYNC_CONFIG_DIR/sync.state"
SYNC_LOG="$SYNC_CONFIG_DIR/sync.log"
CONFLICT_LOG="$SYNC_CONFIG_DIR/conflicts.log"

# Host configuration
LOCAL_HOST="Mac01.local"
REMOTE_HOST="mac00"
REMOTE_USER="carric"

# Sync paths
declare -A SYNC_PATHS
SYNC_PATHS["cloudraider"]="$HOME/CloudRaider"
SYNC_PATHS["claude_agents"]="$HOME/.claude/agents"
SYNC_PATHS["projects"]="$HOME/projects"
SYNC_PATHS["dotfiles"]="$HOME/.config"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging function
log() {
    local level=$1
    shift
    echo "$(date '+%Y-%m-%d %H:%M:%S') [$level] $*" | tee -a "$SYNC_LOG"
}

# Initialize sync environment
init_sync() {
    log "INFO" "Initializing sync environment..."

    mkdir -p "$SYNC_CONFIG_DIR"
    touch "$SYNC_STATE_FILE" "$SYNC_LOG" "$CONFLICT_LOG"

    # Create SSH control socket directory
    mkdir -p "$HOME/.ssh/controlmasters"

    # Setup SSH multiplexing for performance
    cat > "$HOME/.ssh/config.d/sync" <<EOF
Host mac00
    HostName mac00
    User carric
    ControlMaster auto
    ControlPath ~/.ssh/controlmasters/%h-%p-%r
    ControlPersist 10m
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Compression yes
EOF

    # Include in main SSH config if not already
    if ! grep -q "Include config.d/\*" "$HOME/.ssh/config" 2>/dev/null; then
        echo "Include config.d/*" >> "$HOME/.ssh/config"
    fi

    log "INFO" "Sync environment initialized"
}

# Perform initial full sync
initial_sync() {
    local direction=$1  # push or pull

    log "INFO" "Starting initial $direction sync..."

    for path_key in "${!SYNC_PATHS[@]}"; do
        local local_path="${SYNC_PATHS[$path_key]}"
        local remote_path="$REMOTE_USER@$REMOTE_HOST:${SYNC_PATHS[$path_key]}"

        if [[ ! -d "$local_path" ]]; then
            mkdir -p "$local_path"
        fi

        log "INFO" "Syncing $path_key: $local_path"

        if [[ "$direction" == "push" ]]; then
            rsync -avz --delete \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                --exclude='*.pyc' \
                --exclude='.DS_Store' \
                --exclude='*.swp' \
                --exclude='.venv' \
                --exclude='venv' \
                --exclude='dist' \
                --exclude='build' \
                --filter=':- .gitignore' \
                "$local_path/" "$remote_path/" 2>&1 | tee -a "$SYNC_LOG"
        else
            rsync -avz --delete \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                --exclude='*.pyc' \
                --exclude='.DS_Store' \
                --exclude='*.swp' \
                --exclude='.venv' \
                --exclude='venv' \
                --exclude='dist' \
                --exclude='build' \
                --filter=':- .gitignore' \
                "$remote_path/" "$local_path/" 2>&1 | tee -a "$SYNC_LOG"
        fi
    done

    log "INFO" "Initial $direction sync completed"
}

# Setup file watchers for real-time sync
setup_watchers() {
    log "INFO" "Setting up file watchers..."

    # Check if fswatch is installed
    if ! command -v fswatch &> /dev/null; then
        log "WARN" "fswatch not found, installing..."
        brew install fswatch
    fi

    # Create watcher script
    cat > "$SYNC_CONFIG_DIR/watcher.sh" <<'WATCHER'
#!/bin/bash

SYNC_CONFIG_DIR="$HOME/.claude/agents/distributed-sync"
source "$SYNC_CONFIG_DIR/sync.conf"

watch_and_sync() {
    local local_path=$1
    local path_key=$2

    fswatch -0 -r -l 0.5 \
        --exclude "\.git/objects" \
        --exclude "node_modules" \
        --exclude "__pycache__" \
        --exclude "\.DS_Store" \
        --exclude "\.swp$" \
        --exclude "\.venv" \
        --exclude "venv" \
        "$local_path" | while read -d "" event; do

        # Get relative path
        rel_path="${event#$local_path/}"

        # Skip if file doesn't exist (deleted)
        if [[ ! -e "$event" ]]; then
            # Handle deletion
            ssh mac00 "rm -f '$event' 2>/dev/null || true"
            continue
        fi

        # Sync single file for efficiency
        rsync -az --relative \
            "$local_path/./$rel_path" \
            "mac00:$(dirname "$local_path")/" 2>/dev/null || true

        echo "$(date '+%H:%M:%S') Synced: $rel_path" >> "$SYNC_CONFIG_DIR/realtime.log"
    done
}

# Start watchers for all paths
for path_key in "${!SYNC_PATHS[@]}"; do
    local_path="${SYNC_PATHS[$path_key]}"
    if [[ -d "$local_path" ]]; then
        watch_and_sync "$local_path" "$path_key" &
        echo $! >> "$SYNC_CONFIG_DIR/watcher.pids"
    fi
done

wait
WATCHER

    chmod +x "$SYNC_CONFIG_DIR/watcher.sh"

    # Save configuration for watcher
    declare -p SYNC_PATHS > "$SYNC_CONFIG_DIR/sync.conf"

    log "INFO" "File watchers configured"
}

# Start real-time sync
start_realtime_sync() {
    log "INFO" "Starting real-time sync..."

    # Stop any existing watchers
    stop_realtime_sync

    # Clear PID file
    > "$SYNC_CONFIG_DIR/watcher.pids"

    # Start watcher in background
    nohup "$SYNC_CONFIG_DIR/watcher.sh" > "$SYNC_CONFIG_DIR/watcher.log" 2>&1 &
    echo $! > "$SYNC_CONFIG_DIR/main_watcher.pid"

    log "INFO" "Real-time sync started (PID: $(cat "$SYNC_CONFIG_DIR/main_watcher.pid"))"
}

# Stop real-time sync
stop_realtime_sync() {
    log "INFO" "Stopping real-time sync..."

    # Kill main watcher
    if [[ -f "$SYNC_CONFIG_DIR/main_watcher.pid" ]]; then
        kill $(cat "$SYNC_CONFIG_DIR/main_watcher.pid") 2>/dev/null || true
        rm "$SYNC_CONFIG_DIR/main_watcher.pid"
    fi

    # Kill all child watchers
    if [[ -f "$SYNC_CONFIG_DIR/watcher.pids" ]]; then
        while read pid; do
            kill $pid 2>/dev/null || true
        done < "$SYNC_CONFIG_DIR/watcher.pids"
        rm "$SYNC_CONFIG_DIR/watcher.pids"
    fi

    log "INFO" "Real-time sync stopped"
}

# Bidirectional sync with conflict detection
bidirectional_sync() {
    log "INFO" "Performing bidirectional sync with conflict detection..."

    for path_key in "${!SYNC_PATHS[@]}"; do
        local local_path="${SYNC_PATHS[$path_key]}"
        local remote_path="${SYNC_PATHS[$path_key]}"

        log "INFO" "Checking $path_key for conflicts..."

        # Use unison for bidirectional sync if available
        if command -v unison &> /dev/null; then
            unison "$local_path" "ssh://$REMOTE_USER@$REMOTE_HOST/$remote_path" \
                -batch -auto -times \
                -ignore "Path .git/objects" \
                -ignore "Path node_modules" \
                -ignore "Path __pycache__" \
                -ignore "Name *.pyc" \
                -ignore "Name .DS_Store" \
                -ignore "Name *.swp" \
                2>&1 | tee -a "$SYNC_LOG"
        else
            # Fallback to rsync with careful conflict handling
            # First, get file lists from both sides
            local local_files=$(find "$local_path" -type f -newer "$SYNC_STATE_FILE" 2>/dev/null | head -100)
            local remote_files=$(ssh "$REMOTE_HOST" "find $remote_path -type f -newer $SYNC_STATE_FILE 2>/dev/null | head -100")

            # Compare and detect conflicts
            for file in $local_files; do
                rel_path="${file#$local_path/}"
                remote_file="$remote_path/$rel_path"

                if ssh "$REMOTE_HOST" "test -f '$remote_file'" 2>/dev/null; then
                    local_mod=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null)
                    remote_mod=$(ssh "$REMOTE_HOST" "stat -f %m '$remote_file' 2>/dev/null || stat -c %Y '$remote_file' 2>/dev/null")

                    if [[ "$local_mod" != "$remote_mod" ]]; then
                        echo "$(date '+%Y-%m-%d %H:%M:%S') CONFLICT: $rel_path" >> "$CONFLICT_LOG"
                        # Keep both versions
                        cp "$file" "$file.local.$(date +%s)"
                        scp "$REMOTE_HOST:$remote_file" "$file.remote.$(date +%s)" 2>/dev/null
                    fi
                fi
            done

            # Perform sync
            rsync -avz --update \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                "$local_path/" "$REMOTE_USER@$REMOTE_HOST:$remote_path/"

            rsync -avz --update \
                --exclude='.git/objects' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                "$REMOTE_USER@$REMOTE_HOST:$remote_path/" "$local_path/"
        fi
    done

    # Update sync state
    touch "$SYNC_STATE_FILE"

    log "INFO" "Bidirectional sync completed"
}

# Sync environment variables
sync_environment() {
    log "INFO" "Syncing environment variables..."

    # Export current environment
    env | grep -E "^(PATH|PYTHONPATH|NODE_PATH|GOPATH|JAVA_HOME|CLAUDE_)" > "$SYNC_CONFIG_DIR/env.local"

    # Send to remote
    scp "$SYNC_CONFIG_DIR/env.local" "$REMOTE_HOST:$SYNC_CONFIG_DIR/env.remote"

    # Create environment loader
    cat > "$SYNC_CONFIG_DIR/load_env.sh" <<'ENV'
#!/bin/bash
# Load synchronized environment variables
if [[ -f "$HOME/.claude/agents/distributed-sync/env.remote" ]]; then
    set -a
    source "$HOME/.claude/agents/distributed-sync/env.remote"
    set +a
fi
ENV

    # Add to shell profile if not present
    if ! grep -q "distributed-sync/load_env.sh" "$HOME/.zshrc" 2>/dev/null; then
        echo "source $SYNC_CONFIG_DIR/load_env.sh" >> "$HOME/.zshrc"
    fi

    log "INFO" "Environment variables synced"
}

# Sync git repositories
sync_git_repos() {
    log "INFO" "Syncing git repositories..."

    for path_key in "${!SYNC_PATHS[@]}"; do
        local local_path="${SYNC_PATHS[$path_key]}"

        # Find all git repositories
        find "$local_path" -name ".git" -type d 2>/dev/null | while read git_dir; do
            repo_path=$(dirname "$git_dir")
            rel_path="${repo_path#$local_path/}"

            log "INFO" "Syncing git repo: $rel_path"

            # Ensure remote has the repo
            ssh "$REMOTE_HOST" "mkdir -p '$repo_path'"

            # Sync git directory carefully
            rsync -avz --delete \
                --exclude='hooks/pre-push' \
                --exclude='hooks/pre-commit' \
                "$git_dir/" "$REMOTE_USER@$REMOTE_HOST:$git_dir/"

            # Sync working directory
            rsync -avz --delete \
                --exclude='.git' \
                --exclude='node_modules' \
                --exclude='__pycache__' \
                "$repo_path/" "$REMOTE_USER@$REMOTE_HOST:$repo_path/"
        done
    done

    log "INFO" "Git repositories synced"
}

# Database state sync
sync_databases() {
    log "INFO" "Syncing database states..."

    # PostgreSQL databases
    if command -v pg_dump &> /dev/null; then
        pg_dumpall -U $(whoami) > "$SYNC_CONFIG_DIR/postgres_backup.sql" 2>/dev/null || true
        if [[ -f "$SYNC_CONFIG_DIR/postgres_backup.sql" ]]; then
            scp "$SYNC_CONFIG_DIR/postgres_backup.sql" "$REMOTE_HOST:$SYNC_CONFIG_DIR/"
            ssh "$REMOTE_HOST" "psql -U $(whoami) < $SYNC_CONFIG_DIR/postgres_backup.sql" 2>/dev/null || true
        fi
    fi

    # Redis state
    if command -v redis-cli &> /dev/null; then
        redis-cli --rdb "$SYNC_CONFIG_DIR/redis_backup.rdb" 2>/dev/null || true
        if [[ -f "$SYNC_CONFIG_DIR/redis_backup.rdb" ]]; then
            scp "$SYNC_CONFIG_DIR/redis_backup.rdb" "$REMOTE_HOST:$SYNC_CONFIG_DIR/"
        fi
    fi

    log "INFO" "Database states synced"
}

# Port forwarding setup
setup_port_forwarding() {
    log "INFO" "Setting up port forwarding..."

    cat > "$SYNC_CONFIG_DIR/port_forward.sh" <<'PORTS'
#!/bin/bash

# Common development ports
PORTS=(3000 3001 4200 5000 5432 6379 8000 8080 8081 9000)

for port in "${PORTS[@]}"; do
    # Check if port is in use locally
    if lsof -i :$port &>/dev/null; then
        # Forward to remote
        ssh -fN -L $((port+10000)):localhost:$port mac00 2>/dev/null || true
        echo "Forwarded local:$port to remote:$((port+10000))"
    fi
done
PORTS

    chmod +x "$SYNC_CONFIG_DIR/port_forward.sh"

    log "INFO" "Port forwarding configured"
}

# Session handoff
create_session_handoff() {
    log "INFO" "Creating session handoff mechanism..."

    cat > "$SYNC_CONFIG_DIR/handoff.sh" <<'HANDOFF'
#!/bin/bash

# Save current session state
save_session() {
    # Save current directory
    pwd > "$HOME/.claude/agents/distributed-sync/session.cwd"

    # Save running processes
    ps aux | grep -E "(node|python|java|go)" > "$HOME/.claude/agents/distributed-sync/session.processes"

    # Save tmux sessions if available
    if command -v tmux &> /dev/null; then
        tmux list-sessions > "$HOME/.claude/agents/distributed-sync/session.tmux" 2>/dev/null || true
    fi

    # Sync to remote
    rsync -az "$HOME/.claude/agents/distributed-sync/session.*" \
        "mac00:$HOME/.claude/agents/distributed-sync/"

    echo "Session saved and synced to mac00"
}

# Restore session on remote
restore_session() {
    # Connect to remote and restore
    ssh -t mac00 << 'REMOTE'
    if [[ -f "$HOME/.claude/agents/distributed-sync/session.cwd" ]]; then
        cd $(cat "$HOME/.claude/agents/distributed-sync/session.cwd")
    fi

    if [[ -f "$HOME/.claude/agents/distributed-sync/session.tmux" ]]; then
        tmux attach || tmux new-session
    else
        exec $SHELL
    fi
REMOTE
}

case "${1:-save}" in
    save)
        save_session
        ;;
    restore|connect)
        restore_session
        ;;
    *)
        echo "Usage: $0 [save|restore|connect]"
        ;;
esac
HANDOFF

    chmod +x "$SYNC_CONFIG_DIR/handoff.sh"

    log "INFO" "Session handoff mechanism created"
}

# Status command
show_status() {
    echo -e "${BLUE}=== Distributed Sync Status ===${NC}"

    # Check if real-time sync is running
    if [[ -f "$SYNC_CONFIG_DIR/main_watcher.pid" ]]; then
        pid=$(cat "$SYNC_CONFIG_DIR/main_watcher.pid")
        if kill -0 $pid 2>/dev/null; then
            echo -e "${GREEN}✓${NC} Real-time sync: Running (PID: $pid)"
        else
            echo -e "${RED}✗${NC} Real-time sync: Stopped"
        fi
    else
        echo -e "${YELLOW}○${NC} Real-time sync: Not initialized"
    fi

    # Show sync paths
    echo -e "\n${BLUE}Synchronized Paths:${NC}"
    for path_key in "${!SYNC_PATHS[@]}"; do
        local path="${SYNC_PATHS[$path_key]}"
        if [[ -d "$path" ]]; then
            size=$(du -sh "$path" 2>/dev/null | cut -f1)
            echo -e "  ${GREEN}✓${NC} $path_key: $path ($size)"
        else
            echo -e "  ${RED}✗${NC} $path_key: $path (not found)"
        fi
    done

    # Show recent sync activity
    if [[ -f "$SYNC_CONFIG_DIR/realtime.log" ]]; then
        echo -e "\n${BLUE}Recent Sync Activity:${NC}"
        tail -5 "$SYNC_CONFIG_DIR/realtime.log" | sed 's/^/  /'
    fi

    # Show conflicts if any
    if [[ -f "$CONFLICT_LOG" && -s "$CONFLICT_LOG" ]]; then
        echo -e "\n${YELLOW}⚠ Recent Conflicts:${NC}"
        tail -3 "$CONFLICT_LOG" | sed 's/^/  /'
    fi
}

# Main command interface
case "${1:-help}" in
    init)
        init_sync
        ;;
    start)
        init_sync
        initial_sync "push"
        setup_watchers
        start_realtime_sync
        setup_port_forwarding
        create_session_handoff
        sync_environment
        echo -e "${GREEN}✓${NC} Distributed sync started successfully"
        ;;
    stop)
        stop_realtime_sync
        echo -e "${GREEN}✓${NC} Real-time sync stopped"
        ;;
    sync)
        bidirectional_sync
        ;;
    push)
        initial_sync "push"
        ;;
    pull)
        initial_sync "pull"
        ;;
    git)
        sync_git_repos
        ;;
    db|database)
        sync_databases
        ;;
    env|environment)
        sync_environment
        ;;
    handoff|session)
        shift
        "$SYNC_CONFIG_DIR/handoff.sh" "$@"
        ;;
    status)
        show_status
        ;;
    logs)
        tail -f "$SYNC_LOG"
        ;;
    help|*)
        cat <<EOF
Distributed Computing Sync Manager

Usage: $0 <command> [options]

Commands:
  init          Initialize sync environment
  start         Start full synchronization system
  stop          Stop real-time synchronization
  sync          Perform bidirectional sync
  push          Push local changes to remote
  pull          Pull remote changes to local
  git           Sync git repositories
  db|database   Sync database states
  env           Sync environment variables
  handoff       Save/restore session for handoff
  status        Show sync status
  logs          Show sync logs
  help          Show this help message

Examples:
  $0 start           # Start complete sync system
  $0 status          # Check sync status
  $0 handoff save    # Save session before switching
  $0 handoff connect # Connect to remote with restored session

EOF
        ;;
esac