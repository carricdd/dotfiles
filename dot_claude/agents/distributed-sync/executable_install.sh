#!/bin/bash

# Distributed Sync System Installer
# Sets up complete bidirectional sync between local and mac00

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Installation directory
INSTALL_DIR="$HOME/.claude/agents/distributed-sync"

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║     ${YELLOW}Distributed Computing Sync System Installer${CYAN}           ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"

# Check prerequisites
echo -e "\n${BLUE}Checking prerequisites...${NC}"

check_command() {
    local cmd=$1
    local install_cmd=$2

    if command -v "$cmd" &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $cmd"
        return 0
    else
        echo -e "  ${YELLOW}⚠${NC}  $cmd not found"
        if [[ -n "$install_cmd" ]]; then
            echo -e "      Installing $cmd..."
            eval "$install_cmd"
            return $?
        else
            echo -e "      ${RED}Please install $cmd manually${NC}"
            return 1
        fi
    fi
}

# Check required tools
check_command "rsync" ""
check_command "ssh" ""
check_command "git" ""
check_command "jq" "brew install jq"
check_command "fswatch" "brew install fswatch"

# Test SSH connection
echo -e "\n${BLUE}Testing SSH connection to mac00...${NC}"
if ssh -o ConnectTimeout=5 mac00 "echo 'Connected'" &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} SSH connection successful"
else
    echo -e "  ${RED}✗${NC} Cannot connect to mac00"
    echo -e "  ${YELLOW}Please ensure SSH access is configured${NC}"
    exit 1
fi

# Create installation directory
echo -e "\n${BLUE}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"
echo -e "  ${GREEN}✓${NC} Created $INSTALL_DIR"

# Make scripts executable
echo -e "\n${BLUE}Setting up executable permissions...${NC}"
chmod +x "$INSTALL_DIR"/*.sh 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} Scripts are executable"

# Setup SSH multiplexing
echo -e "\n${BLUE}Configuring SSH multiplexing...${NC}"
mkdir -p "$HOME/.ssh/controlmasters"
mkdir -p "$HOME/.ssh/config.d"

cat > "$HOME/.ssh/config.d/distributed-sync" <<EOF
Host mac00
    HostName mac00
    User $(whoami)
    ControlMaster auto
    ControlPath ~/.ssh/controlmasters/%h-%p-%r
    ControlPersist 10m
    ServerAliveInterval 60
    ServerAliveCountMax 3
    Compression yes
EOF

# Include in main SSH config if needed
if [[ ! -f "$HOME/.ssh/config" ]]; then
    touch "$HOME/.ssh/config"
    chmod 600 "$HOME/.ssh/config"
fi

if ! grep -q "Include config.d/\*" "$HOME/.ssh/config" 2>/dev/null; then
    echo -e "\nInclude config.d/*" >> "$HOME/.ssh/config"
fi

echo -e "  ${GREEN}✓${NC} SSH multiplexing configured"

# Install remote components
echo -e "\n${BLUE}Installing remote components on mac00...${NC}"

# Copy scripts to remote
scp -q "$INSTALL_DIR"/*.sh "mac00:$INSTALL_DIR/" 2>/dev/null || {
    ssh mac00 "mkdir -p '$INSTALL_DIR'"
    scp "$INSTALL_DIR"/*.sh "mac00:$INSTALL_DIR/"
}

# Make remote scripts executable
ssh mac00 "chmod +x '$INSTALL_DIR'/*.sh"

echo -e "  ${GREEN}✓${NC} Remote components installed"

# Create aliases
echo -e "\n${BLUE}Setting up command aliases...${NC}"

ALIAS_FILE="$HOME/.claude/agents/distributed-sync/aliases.sh"
cat > "$ALIAS_FILE" <<'ALIASES'
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
ALIASES

chmod +x "$ALIAS_FILE"

# Add to shell profile
for profile in "$HOME/.bashrc" "$HOME/.zshrc"; do
    if [[ -f "$profile" ]]; then
        if ! grep -q "distributed-sync/aliases.sh" "$profile" 2>/dev/null; then
            echo -e "\n# Distributed Sync System" >> "$profile"
            echo "source $ALIAS_FILE" >> "$profile"
        fi
    fi
done

echo -e "  ${GREEN}✓${NC} Command aliases configured"

# Initialize sync system
echo -e "\n${BLUE}Initializing sync system...${NC}"
chmod +x "$INSTALL_DIR/sync-manager-v2.sh"
"$INSTALL_DIR/sync-manager-v2.sh" init
"$INSTALL_DIR/universal-launcher.sh" init
echo -e "  ${GREEN}✓${NC} Sync system initialized"

# Discover existing projects
echo -e "\n${BLUE}Discovering existing projects...${NC}"
"$INSTALL_DIR/universal-launcher.sh" discover > /dev/null 2>&1
project_count=$("$INSTALL_DIR/universal-launcher.sh" list 2>/dev/null | grep -c ":" || echo "0")
echo -e "  ${GREEN}✓${NC} Found $project_count projects"

# Create example configuration
echo -e "\n${BLUE}Creating example configuration...${NC}"

cat > "$INSTALL_DIR/sync-config.yaml" <<EOF
# Distributed Sync Configuration
version: 1.0

hosts:
  primary: $(hostname)
  secondary: mac00

sync_paths:
  - name: cloudraider
    path: \$HOME/CloudRaider
    exclude:
      - .git/objects
      - node_modules
      - __pycache__
      - "*.pyc"
      - .DS_Store
      - .venv
      - venv

  - name: claude_agents
    path: \$HOME/.claude/agents
    exclude:
      - "*.log"
      - "*.pid"

  - name: projects
    path: \$HOME/projects
    exclude:
      - node_modules
      - dist
      - build

settings:
  realtime_sync: true
  conflict_resolution: keep_both
  sync_interval: 5
  compression: true
  preserve_permissions: true
  preserve_timestamps: true

features:
  git_sync: true
  database_sync: false
  environment_sync: true
  port_forwarding: true
  session_handoff: true
EOF

echo -e "  ${GREEN}✓${NC} Configuration created"

# Installation summary
echo -e "\n${CYAN}═══════════════════════════════════════════${NC}"
echo -e "${CYAN}        Installation Complete!${NC}"
echo -e "${CYAN}═══════════════════════════════════════════${NC}"

echo -e "\n${GREEN}✓${NC} Distributed sync system installed successfully"
echo -e "${GREEN}✓${NC} Bidirectional sync configured between $(hostname) and mac00"
echo -e "${GREEN}✓${NC} Real-time file watching ready"
echo -e "${GREEN}✓${NC} Project launcher configured"
echo -e "${GREEN}✓${NC} Session handoff mechanism ready"

echo -e "\n${YELLOW}Quick Start Commands:${NC}"
echo -e "  ${CYAN}dsync start${NC}      - Start real-time sync"
echo -e "  ${CYAN}dsync status${NC}     - Check sync status"
echo -e "  ${CYAN}dlaunch select${NC}   - Launch a project"
echo -e "  ${CYAN}dtest${NC}            - Run test suite"
echo -e "  ${CYAN}dashboard${NC}        - Show status dashboard"

echo -e "\n${YELLOW}Session Switching:${NC}"
echo -e "  ${CYAN}switch-mac00${NC}     - Switch to mac00 with session"
echo -e "  ${CYAN}dsync handoff${NC}    - Manual session handoff"

echo -e "\n${MAGENTA}To start using the system:${NC}"
echo -e "  1. Source your shell profile: ${CYAN}source ~/.zshrc${NC}"
echo -e "  2. Start sync: ${CYAN}dsync start${NC}"
echo -e "  3. Launch dashboard: ${CYAN}dashboard${NC}"

echo -e "\n${BLUE}Testing the installation...${NC}"
if "$INSTALL_DIR/sync-manager.sh" status &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Sync manager operational"
else
    echo -e "  ${YELLOW}⚠${NC}  Sync manager needs initialization"
fi

if "$INSTALL_DIR/universal-launcher.sh" list &> /dev/null; then
    echo -e "  ${GREEN}✓${NC} Project launcher operational"
else
    echo -e "  ${YELLOW}⚠${NC}  Project launcher needs initialization"
fi

echo -e "\n${GREEN}Installation complete!${NC} Run ${CYAN}source ~/.zshrc${NC} then ${CYAN}dsync start${NC} to begin."