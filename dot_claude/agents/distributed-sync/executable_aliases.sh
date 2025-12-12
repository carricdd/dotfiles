#!/bin/bash

# Distributed Sync Aliases
alias dsync="$HOME/.claude/agents/distributed-sync/sync-manager-v2.sh"
alias dlaunch="$HOME/.claude/agents/distributed-sync/universal-launcher.sh"
alias dtest="$HOME/.claude/agents/distributed-sync/test-sync.sh"

# Quick commands
alias ds-start="dsync start"
alias ds-stop="dsync stop"
alias ds-status="dsync status"
alias ds-sync="dsync sync"
alias ds-handoff="dsync handoff"

# Project commands
alias dp-launch="dlaunch launch"
alias dp-select="dlaunch select"
alias dp-discover="dlaunch discover"
alias dp-list="dlaunch list"

# Session switching
alias switch-mac00="dsync handoff save && ssh mac00 'source ~/.claude/agents/distributed-sync/aliases.sh && dsync handoff restore'"
alias switch-local="dsync handoff restore"

# Development helpers
sync-watch() {
    fswatch -0 -r "$1" | while read -d "" event; do
        rsync -az "$event" "mac00:$event"
        echo "Synced: $event"
    done
}

# Quick project creation
create-project() {
    local name=${1:-new_project}
    local type=${2:-python}
    local path="$HOME/CloudRaider/$name"

    mkdir -p "$path"
    cd "$path"

    case "$type" in
        python)
            echo "# $name" > README.md
            echo "print('Hello from $name')" > main.py
            echo "requests==2.28.0" > requirements.txt
            ;;
        node)
            echo "# $name" > README.md
            cat > package.json <<EOF
{
  "name": "$name",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
  }
}
EOF
            echo "console.log('Hello from $name');" > index.js
            ;;
        *)
            echo "# $name" > README.md
            ;;
    esac

    git init
    git add .
    git commit -m "Initial commit"

    dlaunch register "$name" "$path" "$type"
    echo "Project created: $path"
}

# Show sync dashboard
dashboard() {
    clear
    dlaunch dashboard
}
