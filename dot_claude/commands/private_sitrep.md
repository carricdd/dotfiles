# SITREP - Situation Report

Morning situation report with **maximum mesh parallelism**.

## Execution Model (MANDATORY - NO EXCEPTIONS)

```
MESH + PARALLEL + CRAOF = DEFAULT
MEASURE EVERYTHING = REQUIRED
```

- **SPAWN 12+ AGENTS** - Use the mesh, not just localhost
- **ALL queries** route through CRAOF
- **ALL agents** spawn in parallel (single message, multiple Task tools)
- **TRACK TIMING** - Log start/end for every agent to measure efficiency
- **NEVER** run sequentially when parallel is possible
- **NEVER** waste mesh capacity - 90 cores available, USE THEM

## Mesh Capacity (USE IT ALL)

| Node | Cores | RAM | Role | Max Concurrent Agents |
|------|-------|-----|------|----------------------|
| mac01 | 10 | 24GB | Control | 3-4 (quick tasks) |
| mac00 | 16 | 64GB | Heavy compute | 3-4 |
| mac03 | 16 | 64GB | Compute | 2-3 |
| ymir | 24 | 64GB | Heavy CPU | 4-5 |
| loki | 16 | 64GB | GPU/Monitor | 2-3 |
| **TOTAL** | **82** | **280GB** | | **14-19 agents** |

## Spawn These 12 Agents IN PARALLEL

**Single message with 12 Task tool invocations. DO NOT serialize.**

### mac01 Agents (Control Node - 4 quick agents)

**Agent 1: Session Context**
```
Read ~/Projects/cloudraider/CloudRaider-Portal/progress.md
Return: Unfinished tasks from last session
```

**Agent 2: Git State**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
git log --oneline -10
git status --short
Return: Recent commits, uncommitted changes
```

**Agent 3: Job Orchestrator Status**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/cloudraider-job-orchestrator.cjs status
Return: Running/stopped, recent failures
```

**Agent 4: Database Connectivity**
```
Check localhost:5433 port-forward
Query: SELECT COUNT(*) FROM soc.security_events WHERE created_at > NOW() - INTERVAL '24 hours'
Return: Connected/disconnected, event count
```

### mac00 Agents (M3 Max - 3 heavy agents)

**Agent 5: Email Triage - CloudRaider**
```
Check security@cloudraider.io for urgent items
Flag: urgent, breach, incident, down, critical, ransomware
Return: Urgent count and subjects
```

**Agent 6: Email Triage - LifeScan**
```
Check LifeScan shared mailbox for urgent items
Return: Urgent count and subjects
```

**Agent 7: Threat Intel Summary**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "summarize threat intel last 24 hours"
Return: New ransomware victims, CVEs, IOCs
```

### ymir Agents (24 cores - 4 heavy CPU agents)

**Agent 8: LifeScan Alerts**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "analyze LifeScan alerts last 24 hours"
Return: Crit/High/Med counts, data freshness
```

**Agent 9: CGL Alerts**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "analyze CGL alerts last 24 hours"
Return: Crit/High/Med counts, data freshness
```

**Agent 10: Elevos + AmusementMasters Alerts**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "analyze Elevos and AmusementMasters alerts last 24 hours"
Return: Crit/High/Med counts per customer
```

**Agent 11: CloudRaider Internal Alerts**
```
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "analyze CloudRaider internal alerts last 24 hours"
Return: Crit/High/Med counts, any privileged account activity
```

### loki Agent (Monitoring - 1 agent)

**Agent 12: Mesh & K8s Health**
```
node ~/.claude/mesh/health-check.cjs quick
kubectl get nodes
kubectl get pods -n cloudraider-data
Return: Nodes online, K8s status, pod health
```

## Performance Tracking (REQUIRED)

Log this for EVERY sitrep:
```javascript
// Store in K8s database: craof.sitrep_performance
{
  sitrep_id: uuid,
  timestamp: ISO8601,
  agents_spawned: 12,
  agents_completed: 12,
  total_duration_ms: X,
  agent_timings: [
    { agent: "session_context", node: "mac01", duration_ms: X },
    { agent: "lifescan_alerts", node: "ymir", duration_ms: X },
    // ...
  ],
  mesh_utilization: {
    mac01: { cores_used: 4, cores_available: 10 },
    ymir: { cores_used: 4, cores_available: 24 },
    // ...
  }
}
```

## Output Format

```
## SITREP - [DATE] [TIME]
**Agents: 12 | Duration: Xms | Mesh Utilization: X%**

### Unfinished from Last Session
- [ ] Item 1
- [ ] Item 2

### Platform Status: [GREEN/YELLOW/RED]
- Job orchestrator: [running/stopped]
- Alert pipeline: [healthy/BROKEN - last alert: DATE]
- Database: [connected/DOWN]
- 15-min polling: [active/DEAD]

### Customer Alerts (24h)
| Customer | Crit | High | Med | Data Age | Status |
|----------|------|------|-----|----------|--------|
| LifeScan | X | X | X | Xh | [OK/STALE/RED] |
| CGL | X | X | X | Xh | [OK/STALE/RED] |
| Elevos | X | X | X | Xh | [OK/STALE/RED] |
| AmusementMasters | X | X | X | Xh | [OK/STALE/RED] |
| CloudRaider | X | X | X | Xh | [OK/STALE/RED] |

### Threat Intel (24h)
- New ransomware victims: X
- New CVEs: X
- New IOCs: X

### Urgent Items
1. [item] - [action needed]

### Mesh: [HEALTHY/DEGRADED]
- Nodes: X/7 online
- K8s: [Ready/NotReady]

### First Actions (Priority Order)
1. [Most critical]
2. [Second]
3. [Third]

### Performance vs Last Sitrep
- This run: X agents, Xms
- Last run: X agents, Xms
- Improvement: X%
```

## Alert Pipeline Debug

If Teams alerts stopped:
1. `node scripts/cloudraider-job-orchestrator.cjs status` - check job health
2. Query `soc.scheduled_jobs` for failures
3. Verify `TEAMS_WEBHOOK_URL` in ~/.zsh_env
4. Manual test: `node bin/alerts/send-client-alert-summary-to-teams.cjs`
