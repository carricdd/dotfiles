# Claude Code Debloat & Health Check

Run a comprehensive health assessment and cleanup of Claude Code state files.

## Instructions

1. **Assess Current State** - Check sizes of all Claude tracking files:
   - `~/.claude/projects/` (conversation JSONL files - biggest bloat source)
   - `~/.claude/history.jsonl` (command history)
   - `~/.claude/debug/` (debug logs)
   - `~/.claude/file-history/` (file change tracking)
   - `~/.claude/shell-snapshots/` (shell state)
   - `~/.claude/backups/` (nightly backups)
   - `~/.claude.json` (main state file)

2. **Show Bloat Report** - Display:
   - Total size of ~/.claude directory
   - Top 10 largest files
   - Files older than 14 days
   - Count of JSONL conversation files

3. **Run Cleanup** - Delete old files:
   - JSONL conversations older than 14 days
   - Trim history.jsonl to 1000 entries if over 2000
   - Debug logs older than 7 days
   - File history older than 7 days
   - Shell snapshots older than 7 days
   - Empty directories

4. **Show Results** - Before/after comparison

## Commands to Run

```bash
# Assessment
echo "=== CLAUDE CODE HEALTH CHECK ==="
du -sh ~/.claude
echo ""
echo "Directory breakdown:"
du -sh ~/.claude/* 2>/dev/null | sort -hr | head -15
echo ""
echo "Largest JSONL files:"
find ~/.claude/projects -name "*.jsonl" -exec ls -lh {} \; 2>/dev/null | sort -k5 -hr | head -10
echo ""
echo "Files older than 14 days:"
find ~/.claude/projects -name "*.jsonl" -mtime +14 2>/dev/null | wc -l
```

```bash
# Cleanup
echo "=== RUNNING CLEANUP ==="
find ~/.claude/projects -name "*.jsonl" -mtime +14 -delete
find ~/.claude/debug -type f -mtime +7 -delete
find ~/.claude/file-history -type f -mtime +7 -delete
find ~/.claude/shell-snapshots -type f -mtime +7 -delete
find ~/.claude/projects -type d -empty -delete 2>/dev/null

# Trim history if needed
LINES=$(wc -l < ~/.claude/history.jsonl 2>/dev/null | tr -d ' ')
if [ "$LINES" -gt 2000 ]; then
  tail -1000 ~/.claude/history.jsonl > ~/.claude/history.jsonl.tmp
  mv ~/.claude/history.jsonl.tmp ~/.claude/history.jsonl
  echo "Trimmed history.jsonl from $LINES to 1000 entries"
fi

echo ""
echo "=== AFTER CLEANUP ==="
du -sh ~/.claude
du -sh ~/.claude/* 2>/dev/null | sort -hr | head -10
```

## Healthy Thresholds

| Item | Healthy | Warning | Critical |
|------|---------|---------|----------|
| ~/.claude total | <500MB | 500MB-1GB | >1GB |
| projects/ | <100MB | 100-200MB | >200MB |
| history.jsonl | <1MB | 1-5MB | >5MB |
| .claude.json | <5MB | 5-10MB | >10MB |

## Note

The nightly maintenance script at `~/.claude/scripts/nightly-maintenance.sh` runs at 2am and handles this automatically. This command is for on-demand cleanup when you notice slowness or context issues.
