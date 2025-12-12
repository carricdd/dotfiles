#!/bin/bash
#
# Universal Memory Loader - Shell Wrapper
# Uses dependencies from supabase-memory-system project
#

# Load credentials from ~/.zsh_env
if [ -f ~/.zsh_env ]; then
  source ~/.zsh_env
fi

export NODE_PATH=/Users/carric/Projects/cloudraider/supabase-memory-system/node_modules
cd /Users/carric/Projects/cloudraider/supabase-memory-system
node /Users/carric/.claude/scripts/universal-memory-loader.cjs "$@"
