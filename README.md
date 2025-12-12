# CloudRaider Dotfiles - Chezmoi Config Sync

Cross-machine configuration sync for Claude Code across the mesh.

## What Syncs

| Directory | Purpose |
|-----------|---------|
| `~/.claude/CLAUDE.md` | Main Claude Code config (v5.0 MESH-ENFORCED) |
| `~/.claude/agents/` | 3-tier agent definitions |
| `~/.claude/commands/` | Slash commands (craof, sitrep, intel, debloat) |
| `~/.claude/scripts/` | Preflight, maintenance scripts |
| `~/.claude/mesh/` | topology.json, health-check |
| `~/.claude/docs/` | Reference documentation |

## What Does NOT Sync (Local Only)

| Directory | Reason |
|-----------|--------|
| `backups/`, `file-history/` | Contains secrets in backup files |
| `mcp-servers/` | Has credentials.json |
| `history.jsonl`, `logs/`, `*.log` | Session ephemera |
| `session-env/`, `todos/`, `plans/` | Runtime state |
| `node_modules/` | Install locally via npm |
| `~/.zsh_env` | API keys - sync manually via scp |

## Quick Reference

### Update config (from any Mac)

```bash
# 1. Make changes to files in ~/.claude/

# 2. Add to chezmoi and push
chezmoi add ~/.claude/CLAUDE.md  # or other changed files
cd ~/.local/share/chezmoi
git add . && git commit -m "description" && git push
```

### Pull changes

```bash
# mac01, mac00 (Apple Silicon - brew in /opt/homebrew)
chezmoi update

# mac03 (Intel - brew in /usr/local)
/usr/local/bin/chezmoi update
```

### First-time setup on new Mac

```bash
# 1. Install chezmoi
brew install chezmoi

# 2. Initialize from repo
chezmoi init https://github.com/carricdd/dotfiles.git

# 3. Preview changes
chezmoi diff

# 4. Apply
chezmoi apply --force

# 5. Copy secrets (from mac01)
scp mac01:~/.zsh_env ~/.zsh_env

# 6. Install script dependencies
cd ~/.claude/scripts && npm install
```

## Secrets Management

API keys live in `~/.zsh_env` and are NOT synced via chezmoi (intentionally).

To sync secrets across mesh:
```bash
# From mac01
scp ~/.zsh_env mac00:~/.zsh_env
scp ~/.zsh_env mac03:~/.zsh_env
```

## Mesh Nodes

| Node | Arch | Chezmoi Path |
|------|------|--------------|
| mac01 | Apple Silicon | `chezmoi` (in PATH) |
| mac00 | Apple Silicon | `chezmoi` (in PATH) |
| mac03 | Intel | `/usr/local/bin/chezmoi` |

## Troubleshooting

**chezmoi not found via SSH:**
```bash
# Intel Macs
/usr/local/bin/chezmoi <command>

# Apple Silicon
/opt/homebrew/bin/chezmoi <command>
```

**Conflicts during update:**
```bash
chezmoi diff           # See what would change
chezmoi merge <file>   # Merge conflicts
chezmoi apply --force  # Force apply (overwrites local)
```
