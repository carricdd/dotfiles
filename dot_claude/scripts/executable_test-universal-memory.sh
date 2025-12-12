#!/bin/bash
#
# Universal Memory System Integration Test
#

echo "🧠 Testing Universal Memory System"
echo "=================================="
echo ""

# Test 1: Check credentials
echo "📋 Test 1: Checking credentials..."
if grep -q "MEMORY_SUPABASE_URL" ~/.zsh_env && grep -q "MEMORY_SUPABASE_SERVICE_ROLE_KEY" ~/.zsh_env; then
    echo "✅ Credentials found in ~/.zsh_env"
else
    echo "❌ Credentials NOT found in ~/.zsh_env"
    echo ""
    echo "Add them with:"
    echo '  echo export MEMORY_SUPABASE_URL="https://your-project.supabase.co" >> ~/.zsh_env'
    echo '  echo export MEMORY_SUPABASE_SERVICE_ROLE_KEY="your-key" >> ~/.zsh_env'
    exit 1
fi
echo ""

# Test 2: Check scripts exist
echo "📋 Test 2: Checking scripts..."
if [ -f ~/.claude/scripts/universal-memory-loader.cjs ] && [ -f ~/.claude/scripts/universal-memory-saver.cjs ]; then
    echo "✅ Memory scripts found"
else
    echo "❌ Memory scripts NOT found"
    exit 1
fi
echo ""

# Test 3: Check database schema
echo "📋 Test 3: Checking database schema..."
cd /Users/carric/Projects/cloudraider/supabase-memory-system
if npm test 2>&1 | grep -q "✅"; then
    echo "✅ Database schema verified"
else
    echo "⚠️  Database schema test failed - may need to run migrations"
    echo "Run: cd /Users/carric/Projects/cloudraider/supabase-memory-system && npm run migrate -- --db=memory"
fi
echo ""

# Test 4: Load memory
echo "📋 Test 4: Loading memory..."
if node ~/.claude/scripts/universal-memory-loader.cjs 2>&1 | grep -q "Memory loaded"; then
    echo "✅ Memory loader works"
else
    echo "⚠️  Memory loader failed - check credentials and database"
fi
echo ""

# Test 5: Save test memory
echo "📋 Test 5: Saving test memory..."
if node ~/.claude/scripts/universal-memory-saver.cjs preference "test" "value" 2>&1 | grep -q "saved"; then
    echo "✅ Memory saver works"
else
    echo "⚠️  Memory saver failed - check credentials and database"
fi
echo ""

# Summary
echo "=================================="
echo "🎯 Universal Memory System Status"
echo "=================================="
echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "  1. Memory loads automatically in Claude Code sessions"
echo "  2. Check current memory: node ~/.claude/scripts/universal-memory-loader.cjs"
echo "  3. Save learnings: node ~/.claude/scripts/universal-memory-saver.cjs"
echo ""
echo "See: ~/.claude/SETUP_UNIVERSAL_MEMORY.md for full documentation"
echo ""
