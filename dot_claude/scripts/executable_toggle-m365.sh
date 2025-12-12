#!/bin/bash

# Toggle M365 MCP Server for Claude Code
# Usage: toggle-m365.sh [on|off|status]

CONFIG_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
BACKUP_FILE="$HOME/Library/Application Support/Claude/claude_desktop_config.json.m365backup"

case "$1" in
  "off")
    echo "Disabling M365 MCP server..."
    # Backup current config
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    # Remove ms365 server using jq
    jq 'del(.mcpServers.ms365)' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
    echo "✓ M365 disabled. Restart Claude Code to take effect."
    echo "  Backup saved to: $BACKUP_FILE"
    ;;

  "on")
    echo "Enabling M365 MCP server..."
    if [ -f "$BACKUP_FILE" ]; then
      # Restore from backup
      cp "$BACKUP_FILE" "$CONFIG_FILE"
      echo "✓ M365 enabled from backup. Restart Claude Code to take effect."
    else
      # Add ms365 config
      jq '.mcpServers.ms365 = {
        "command": "npx",
        "args": ["-y", "@softeria/ms-365-mcp-server", "--force-work-scopes"]
      }' "$CONFIG_FILE" > "$CONFIG_FILE.tmp" && mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"
      echo "✓ M365 enabled. Restart Claude Code to take effect."
    fi
    ;;

  "status")
    if jq -e '.mcpServers.ms365' "$CONFIG_FILE" > /dev/null 2>&1; then
      echo "✓ M365 is currently ENABLED"
      echo ""
      echo "MCP Servers configured:"
      jq -r '.mcpServers | keys[]' "$CONFIG_FILE"
    else
      echo "✗ M365 is currently DISABLED"
      echo ""
      echo "MCP Servers configured:"
      jq -r '.mcpServers | keys[]' "$CONFIG_FILE"
    fi
    ;;

  *)
    echo "Usage: toggle-m365.sh [on|off|status]"
    echo ""
    echo "Commands:"
    echo "  on      - Enable M365 MCP server"
    echo "  off     - Disable M365 MCP server (saves ~193k tokens)"
    echo "  status  - Check current status"
    echo ""
    echo "Note: Claude Code must be restarted after toggling."
    exit 1
    ;;
esac
