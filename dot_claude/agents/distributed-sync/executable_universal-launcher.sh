#!/bin/bash

# Universal Development Launcher
# Launch any project from any host with automatic sync

set -euo pipefail

# Configuration
LAUNCHER_DIR="$HOME/.claude/agents/distributed-sync"
PROJECT_REGISTRY="$LAUNCHER_DIR/projects.json"
SYNC_MANAGER="$LAUNCHER_DIR/sync-manager.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Initialize launcher
init_launcher() {
    mkdir -p "$LAUNCHER_DIR"

    # Create project registry if not exists
    if [[ ! -f "$PROJECT_REGISTRY" ]]; then
        cat > "$PROJECT_REGISTRY" <<'JSON'
{
  "projects": {
    "cloudraider": {
      "path": "$HOME/CloudRaider",
      "type": "python",
      "start": "python main.py",
      "env": ".env",
      "ports": [8000, 8001],
      "dependencies": ["python3", "pip", "venv"]
    },
    "claude-agents": {
      "path": "$HOME/.claude/agents",
      "type": "bash",
      "start": "bash",
      "env": null,
      "ports": [],
      "dependencies": ["bash", "jq", "rsync"]
    }
  },
  "templates": {
    "python": {
      "setup": "python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt",
      "start": "source .venv/bin/activate && python main.py",
      "test": "pytest",
      "lint": "black . && flake8"
    },
    "node": {
      "setup": "npm install",
      "start": "npm start",
      "test": "npm test",
      "build": "npm run build"
    },
    "go": {
      "setup": "go mod download",
      "start": "go run .",
      "test": "go test ./...",
      "build": "go build"
    }
  }
}
JSON
    fi

    echo -e "${GREEN}✓${NC} Launcher initialized"
}

# Register a new project
register_project() {
    local name=$1
    local path=$2
    local type=${3:-auto}

    # Auto-detect project type
    if [[ "$type" == "auto" ]]; then
        if [[ -f "$path/package.json" ]]; then
            type="node"
        elif [[ -f "$path/requirements.txt" ]] || [[ -f "$path/setup.py" ]]; then
            type="python"
        elif [[ -f "$path/go.mod" ]]; then
            type="go"
        elif [[ -f "$path/Cargo.toml" ]]; then
            type="rust"
        elif [[ -f "$path/pom.xml" ]] || [[ -f "$path/build.gradle" ]]; then
            type="java"
        else
            type="generic"
        fi
    fi

    echo -e "${BLUE}Registering project:${NC} $name"
    echo "  Path: $path"
    echo "  Type: $type"

    # Update project registry using jq
    jq --arg name "$name" \
       --arg path "$path" \
       --arg type "$type" \
       '.projects[$name] = {
          "path": $path,
          "type": $type,
          "start": null,
          "env": null,
          "ports": [],
          "dependencies": []
        }' "$PROJECT_REGISTRY" > "$PROJECT_REGISTRY.tmp" && \
    mv "$PROJECT_REGISTRY.tmp" "$PROJECT_REGISTRY"

    echo -e "${GREEN}✓${NC} Project registered: $name"
}

# Launch a project
launch_project() {
    local project_name=$1
    shift
    local extra_args="$@"

    # Check if project exists
    if ! jq -e ".projects[\"$project_name\"]" "$PROJECT_REGISTRY" > /dev/null 2>&1; then
        echo -e "${RED}Error:${NC} Project '$project_name' not found"
        echo "Available projects:"
        jq -r '.projects | keys[]' "$PROJECT_REGISTRY" | sed 's/^/  - /'
        return 1
    fi

    # Get project details
    local project_path=$(jq -r ".projects[\"$project_name\"].path" "$PROJECT_REGISTRY" | envsubst)
    local project_type=$(jq -r ".projects[\"$project_name\"].type" "$PROJECT_REGISTRY")
    local start_cmd=$(jq -r ".projects[\"$project_name\"].start // empty" "$PROJECT_REGISTRY")

    echo -e "${CYAN}═══════════════════════════════════════════${NC}"
    echo -e "${CYAN}    Launching Project: ${YELLOW}$project_name${NC}"
    echo -e "${CYAN}═══════════════════════════════════════════${NC}"

    # Ensure project is synced
    echo -e "\n${BLUE}Step 1:${NC} Checking sync status..."
    if [[ -f "$LAUNCHER_DIR/main_watcher.pid" ]]; then
        echo -e "${GREEN}✓${NC} Real-time sync is active"
    else
        echo -e "${YELLOW}⚠${NC}  Starting sync system..."
        "$SYNC_MANAGER" start
    fi

    # Navigate to project
    echo -e "\n${BLUE}Step 2:${NC} Navigating to project..."
    if [[ ! -d "$project_path" ]]; then
        echo -e "${YELLOW}⚠${NC}  Project path not found locally, pulling from remote..."
        "$SYNC_MANAGER" pull
    fi

    cd "$project_path"
    echo -e "${GREEN}✓${NC} Current directory: $(pwd)"

    # Check dependencies
    echo -e "\n${BLUE}Step 3:${NC} Checking dependencies..."
    local deps=$(jq -r ".projects[\"$project_name\"].dependencies[]?" "$PROJECT_REGISTRY")
    if [[ -n "$deps" ]]; then
        while IFS= read -r dep; do
            if command -v "$dep" &> /dev/null; then
                echo -e "  ${GREEN}✓${NC} $dep"
            else
                echo -e "  ${RED}✗${NC} $dep (missing)"
            fi
        done <<< "$deps"
    fi

    # Setup environment
    echo -e "\n${BLUE}Step 4:${NC} Setting up environment..."
    local env_file=$(jq -r ".projects[\"$project_name\"].env // empty" "$PROJECT_REGISTRY")
    if [[ -n "$env_file" ]] && [[ -f "$env_file" ]]; then
        set -a
        source "$env_file"
        set +a
        echo -e "${GREEN}✓${NC} Environment loaded from $env_file"
    fi

    # Get template commands if no custom start command
    if [[ -z "$start_cmd" ]]; then
        start_cmd=$(jq -r ".templates[\"$project_type\"].start // empty" "$PROJECT_REGISTRY")
    fi

    # Launch project
    echo -e "\n${BLUE}Step 5:${NC} Starting project..."

    if [[ -n "$start_cmd" ]]; then
        echo -e "${GREEN}►${NC} Executing: $start_cmd $extra_args"
        echo -e "${CYAN}───────────────────────────────────────────${NC}\n"

        # Start in tmux if available
        if command -v tmux &> /dev/null; then
            tmux new-session -d -s "$project_name" -c "$project_path" "$start_cmd $extra_args"
            echo -e "${GREEN}✓${NC} Project started in tmux session: $project_name"
            echo -e "${YELLOW}→${NC} Attach with: tmux attach -t $project_name"
        else
            eval "$start_cmd $extra_args"
        fi
    else
        echo -e "${GREEN}✓${NC} Project directory ready"
        echo -e "${YELLOW}→${NC} No start command defined, opening shell..."
        exec $SHELL
    fi
}

# Quick project switcher
quick_switch() {
    local current_host=$(hostname)
    local target_host=${1:-}

    echo -e "${BLUE}Quick Switch Mode${NC}"
    echo "Current host: $current_host"

    # Save current session
    echo -e "\n${YELLOW}→${NC} Saving current session..."
    "$SYNC_MANAGER" handoff save

    if [[ -n "$target_host" ]]; then
        echo -e "${YELLOW}→${NC} Connecting to $target_host..."
        "$SYNC_MANAGER" handoff connect
    else
        echo -e "${GREEN}✓${NC} Session saved. Ready to switch hosts."
    fi
}

# Project discovery
discover_projects() {
    echo -e "${BLUE}Discovering projects...${NC}"

    local search_paths=(
        "$HOME/CloudRaider"
        "$HOME/projects"
        "$HOME/code"
        "$HOME/dev"
        "$HOME/workspace"
    )

    for base_path in "${search_paths[@]}"; do
        if [[ -d "$base_path" ]]; then
            echo -e "\n${CYAN}Searching in:${NC} $base_path"

            # Find Python projects
            find "$base_path" -maxdepth 2 -name "requirements.txt" -o -name "setup.py" 2>/dev/null | while read file; do
                local proj_dir=$(dirname "$file")
                local proj_name=$(basename "$proj_dir")
                echo -e "  ${GREEN}↳${NC} Python: $proj_name ($proj_dir)"
                register_project "$proj_name" "$proj_dir" "python" 2>/dev/null
            done

            # Find Node projects
            find "$base_path" -maxdepth 2 -name "package.json" 2>/dev/null | while read file; do
                local proj_dir=$(dirname "$file")
                local proj_name=$(basename "$proj_dir")
                echo -e "  ${GREEN}↳${NC} Node: $proj_name ($proj_dir)"
                register_project "$proj_name" "$proj_dir" "node" 2>/dev/null
            done

            # Find Go projects
            find "$base_path" -maxdepth 2 -name "go.mod" 2>/dev/null | while read file; do
                local proj_dir=$(dirname "$file")
                local proj_name=$(basename "$proj_dir")
                echo -e "  ${GREEN}↳${NC} Go: $proj_name ($proj_dir)"
                register_project "$proj_name" "$proj_dir" "go" 2>/dev/null
            done
        fi
    done

    echo -e "\n${GREEN}✓${NC} Discovery complete"
}

# Interactive project selector
select_project() {
    echo -e "${BLUE}Select a project to launch:${NC}\n"

    # Get project list
    local projects=($(jq -r '.projects | keys[]' "$PROJECT_REGISTRY"))

    if [[ ${#projects[@]} -eq 0 ]]; then
        echo -e "${YELLOW}No projects registered. Run 'discover' to find projects.${NC}"
        return 1
    fi

    # Display projects with details
    local i=1
    for proj in "${projects[@]}"; do
        local path=$(jq -r ".projects[\"$proj\"].path" "$PROJECT_REGISTRY" | envsubst)
        local type=$(jq -r ".projects[\"$proj\"].type" "$PROJECT_REGISTRY")

        echo -e "  ${CYAN}$i)${NC} ${YELLOW}$proj${NC}"
        echo -e "     Type: $type"
        echo -e "     Path: $path"
        echo ""
        ((i++))
    done

    echo -n "Enter number (1-${#projects[@]}): "
    read -r selection

    if [[ "$selection" =~ ^[0-9]+$ ]] && [[ "$selection" -ge 1 ]] && [[ "$selection" -le ${#projects[@]} ]]; then
        local selected_project="${projects[$((selection-1))]}"
        launch_project "$selected_project"
    else
        echo -e "${RED}Invalid selection${NC}"
        return 1
    fi
}

# Status dashboard
show_dashboard() {
    clear
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║           ${YELLOW}Universal Development Environment${CYAN}               ║${NC}"
    echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"

    # Host information
    echo -e "${CYAN}║${NC} ${BLUE}Host:${NC} $(hostname) ($(whoami))                              ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC} ${BLUE}Time:${NC} $(date '+%Y-%m-%d %H:%M:%S')                        ${CYAN}║${NC}"

    # Sync status
    local sync_status="Inactive"
    if [[ -f "$LAUNCHER_DIR/main_watcher.pid" ]]; then
        if kill -0 $(cat "$LAUNCHER_DIR/main_watcher.pid") 2>/dev/null; then
            sync_status="${GREEN}Active${NC}"
        else
            sync_status="${RED}Stopped${NC}"
        fi
    fi
    echo -e "${CYAN}║${NC} ${BLUE}Sync:${NC} $sync_status                                        ${CYAN}║${NC}"

    echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"

    # Projects
    echo -e "${CYAN}║${NC} ${YELLOW}Registered Projects:${NC}                                      ${CYAN}║${NC}"

    local projects=($(jq -r '.projects | keys[]' "$PROJECT_REGISTRY" 2>/dev/null))
    for proj in "${projects[@]:0:5}"; do
        printf "${CYAN}║${NC}   • %-54s ${CYAN}║${NC}\n" "$proj"
    done

    if [[ ${#projects[@]} -gt 5 ]]; then
        printf "${CYAN}║${NC}   ${YELLOW}... and $((${#projects[@]}-5)) more${NC}%-43s ${CYAN}║${NC}\n" ""
    fi

    echo -e "${CYAN}╠════════════════════════════════════════════════════════════╣${NC}"

    # Quick commands
    echo -e "${CYAN}║${NC} ${MAGENTA}Quick Commands:${NC}                                           ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}launch${NC} <project>  - Launch a project                     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}select${NC}           - Interactive project selector          ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}switch${NC}           - Quick switch to other host            ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}sync${NC}             - Force synchronization                 ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}discover${NC}         - Auto-discover projects                ${CYAN}║${NC}"

    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
}

# Main command interface
case "${1:-dashboard}" in
    init)
        init_launcher
        ;;
    register)
        shift
        register_project "$@"
        ;;
    launch)
        shift
        launch_project "$@"
        ;;
    select)
        select_project
        ;;
    discover)
        discover_projects
        ;;
    switch)
        shift
        quick_switch "$@"
        ;;
    sync)
        "$SYNC_MANAGER" sync
        ;;
    list)
        echo -e "${BLUE}Registered Projects:${NC}"
        jq -r '.projects | to_entries[] | "  \(.key): \(.value.path) [\(.value.type)]"' "$PROJECT_REGISTRY"
        ;;
    dashboard)
        show_dashboard
        ;;
    help|*)
        cat <<EOF
Universal Development Launcher

Usage: $0 <command> [options]

Commands:
  init              Initialize launcher environment
  register <name> <path> [type]   Register a new project
  launch <project>  Launch a specific project
  select            Interactive project selector
  discover          Auto-discover projects
  switch [host]     Quick switch between hosts
  sync              Force synchronization
  list              List registered projects
  dashboard         Show status dashboard
  help              Show this help message

Examples:
  $0 discover                    # Find all projects
  $0 launch cloudraider          # Launch CloudRaider project
  $0 register myapp ~/dev/myapp  # Register new project
  $0 switch mac00                # Switch to mac00 with session

EOF
        ;;
esac