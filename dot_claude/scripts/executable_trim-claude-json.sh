#!/bin/bash
# Trim .claude.json history to prevent death loops
# Keeps only last 50 messages per project

CLAUDE_JSON=~/.claude.json
BACKUP_DIR=~/.claude/backups/auto-trim-$(date +%Y%m%d_%H%M%S)

# Check file size
SIZE_MB=$(du -m "$CLAUDE_JSON" 2>/dev/null | cut -f1)

if [ "$SIZE_MB" -gt 2 ]; then
  echo "🚨 .claude.json is ${SIZE_MB}MB (trimming history)"
  
  # Backup first
  mkdir -p "$BACKUP_DIR"
  cp "$CLAUDE_JSON" "$BACKUP_DIR/claude.json.backup"
  
  # Use Python to trim (jq can't handle large files)
  python3 << 'PYTHON'
import json
import sys

try:
    with open('/Users/carric/.claude.json', 'r') as f:
        data = json.load(f)
    
    # Trim project histories to last 50 messages
    if 'projects' in data:
        for project_path in data['projects']:
            if 'history' in data['projects'][project_path]:
                history = data['projects'][project_path]['history']
                if len(history) > 50:
                    data['projects'][project_path]['history'] = history[-50:]
                    print(f"Trimmed {project_path}: {len(history)} -> 50 messages")
    
    # Write back
    with open('/Users/carric/.claude.json', 'w') as f:
        json.dump(data, f, indent=2)
    
    print("✅ Trim complete")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
PYTHON

  # Show new size
  NEW_SIZE=$(du -m "$CLAUDE_JSON" | cut -f1)
  echo "📊 Size: ${SIZE_MB}MB -> ${NEW_SIZE}MB"
else
  echo "✅ .claude.json is ${SIZE_MB}MB (no trim needed)"
fi
