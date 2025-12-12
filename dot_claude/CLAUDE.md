# UNIVERSAL INSTRUCTIONS FOR ALL CLAUDE CODE SESSIONS

**Version**: 5.0 MESH-ENFORCED | **Last Updated**: 2025-12-11

---

## MANDATORY EXECUTION MODEL (ALL PROJECTS)

```
┌─────────────────────────────────────────────────────────┐
│  MESH + PARALLEL + CRAOF + MEASURE = DEFAULT            │
│  This applies to EVERY project, EVERY session.          │
│  NO EXCEPTIONS.                                         │
└─────────────────────────────────────────────────────────┘
```

### Enforcement Rules

1. **PARALLEL BY DEFAULT** - When spawning agents or running tasks:
   - Use Task tool with MULTIPLE parallel invocations in a SINGLE message
   - NEVER serialize tasks that can run concurrently
   - Target: 10-15 parallel agents for complex operations

2. **USE THE MESH** - 90 cores available, USE THEM:
   - mac01 (10 cores): Quick tasks, control
   - mac00 (16 cores, M3 Max GPU): Heavy compute, ML
   - mac03 (16 cores): Overflow compute
   - ymir (24 cores): Heavy CPU tasks
   - loki (16 cores, RTX 4070): CUDA/GPU tasks

3. **ROUTE THROUGH CRAOF** - For CloudRaider projects:
   ```bash
   cd ~/Projects/cloudraider/CloudRaider-Portal
   node scripts/craof-controller.cjs "<request>"
   ```

4. **MEASURE EVERYTHING** - Track and log:
   - Agent count per operation
   - Execution duration per agent
   - Node assignment
   - Mesh utilization percentage
   - Compare to previous runs

5. **WARN ON INEFFICIENCY** - Flag these violations:
   - Spawning <5 agents when >5 would be faster
   - Using only mac01 when other nodes available
   - Sequential execution when parallel possible
   - Mesh utilization <50%

---

## ENVIRONMENT (macOS/zsh)

**Platform**: Darwin (macOS), Shell: zsh
- Use `uv pip install` (never pip directly)
- `sed -i ''` requires empty string on macOS
- Azure auth: `az login --tenant <id>` (never `--use-device-code`)

---

## CORE RULES

### 1. Surgical Changes Only
ONE REQUEST = ONE CHANGE. Read first, change only what's requested, verify no collateral damage.

### 2. Module-First (No Script Sprawl)
**BEFORE writing ANY new script**: Search for existing scripts first!
```bash
# Always check these locations:
ls scripts/*<keyword>*.cjs
ls modules/**/*<keyword>*.cjs
ls archive/**/*<keyword>*.cjs
```
If a script exists that does what you need → **USE IT**. Don't write new code.
Only create new scripts when no existing solution covers the use case.

### 3. Database > Local Files
- **Permanent**: Database (K8s PostgreSQL)
- **Temporary**: Local files (auto-cleanup at 0200)

### 4. Dark Theme Always
`background: #0f172a`, `cards: #1e293b`, `text: #f1f5f9`

### 5. No Emojis in Customer Docs
Internal docs: OK | Customer deliverables: Never

### 6. Credentials in ~/.zsh_env
Never in project .env files.

### 7. Data Accuracy - VERIFY WITH MULTIPLE SOURCES
**Inaccurate data is worse than no data.** When reporting metrics, counts, or summaries:
- **Cross-validate**: Use multiple sources/methods to verify numbers
- **Sanity check**: Does the data make sense given what else you know? (e.g., 1 connector but alerts from 10+ vendors = RED FLAG)
- **When sources conflict**: Investigate the discrepancy, report the most accurate number with explanation
- **Flag uncertainty**: If you can't verify, say so explicitly
- **Example**: API says 1 data connector, but alerts show Carbon Black, Cisco, AWS, CrowdStrike → query Usage table to find actual 52 data sources

---

## DISTRIBUTED MESH

**Source of Truth**: `~/.claude/mesh/topology.json`

| Node | Cores | RAM | GPU | Use For |
|------|-------|-----|-----|---------|
| mac01 | 10 | 24GB | - | Control (localhost) |
| mac00 | 16 | 64GB | M3 Max | Apple ML |
| mac03 | 16 | 64GB | AMD | CPU tasks |
| loki | 16 | 64GB | RTX 4070 | CUDA GPU |
| ymir | 24 | 64GB | RTX 4060 | Heavy CPU/GPU |
| vultr | 4 | 8GB | - | Cloud/public |

**Commands**: `node ~/.claude/mesh/health-check.cjs [quick|update]`

---

## MAINTENANCE

```bash
doctor                                    # Health check (0-100)
bash ~/.claude/scripts/nightly-maintenance.sh  # Full cleanup
```

**Healthy**: .claude.json <5MB, file-history <10MB, processes 1-2

---

## AZURE ACCESS

**Browser auth only**: `az login --tenant <tenant-id>`

**Global Admin elevation** (when needed):
1. Azure Portal → AAD Properties → Toggle "Access management for Azure resources"
2. Re-login to get User Access Administrator at root scope

**Graph API consent**: Use direct scope URL to trigger admin consent flow.

---

## SESSION STARTUP (RUN FIRST)

```bash
node ~/.claude/scripts/session-preflight.cjs
```

This displays:
- Mesh status (all 90 cores)
- Unfinished tasks from last session
- MANDATORY execution rules reminder
- Performance baseline targets

**If you skip this, you WILL forget the rules.**

---

## REFERENCE

Detailed docs at `~/.claude/docs/`:
- `MESH-REFERENCE.md` - Full node specs, task routing
- `AGENT-REFERENCE.md` - 3-tier agent loading system

