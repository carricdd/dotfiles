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
