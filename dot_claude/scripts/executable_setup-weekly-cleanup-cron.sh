#!/bin/bash
# Setup Weekly Claude Cleanup via Cron
# Runs every Sunday at 2am
# Created: 2025-10-15

echo "📅 Setting up weekly Claude cleanup"
echo "===================================="
echo ""

# Check if cron entry already exists
if crontab -l 2>/dev/null | grep -q "safe-weekly-cleanup.sh"; then
    echo "⚠️  Cron job already exists!"
    echo ""
    echo "Current crontab:"
    crontab -l | grep "safe-weekly-cleanup.sh"
    echo ""
    read -p "Replace existing entry? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
    # Remove old entry
    crontab -l | grep -v "safe-weekly-cleanup.sh" | crontab -
fi

# Add new cron entry (Sundays at 2am)
(crontab -l 2>/dev/null; echo "0 2 * * 0 bash ~/.claude/scripts/safe-weekly-cleanup.sh >> ~/.claude/cleanup.log 2>&1") | crontab -

echo "✅ Cron job installed!"
echo ""
echo "Schedule: Every Sunday at 2:00 AM"
echo "Log file: ~/.claude/cleanup.log"
echo ""
echo "Current crontab:"
crontab -l | grep "safe-weekly-cleanup.sh"
echo ""
echo "To remove:"
echo "  crontab -l | grep -v 'safe-weekly-cleanup.sh' | crontab -"
echo ""
echo "To test now:"
echo "  bash ~/.claude/scripts/safe-weekly-cleanup.sh"
