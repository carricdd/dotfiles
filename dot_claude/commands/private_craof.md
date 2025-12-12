# CRAOF - CloudRaider Adaptive Operations Framework

Route requests to the best approach automatically.

## How It Works

CRAOF analyzes your request and routes to the optimal handler:

| Keywords | Routes To | Purpose |
|----------|-----------|---------|
| analyze, investigate, correlate, pattern | **DS-STAR** | Data analysis with verification loops |
| incident, breach, threat, attack | **IVAM** | Security incident handling |
| automate, schedule, monitor | **SOAR** | Automation workflows |
| research, report, briefing | **Multi-LLM** | Research with citations |

## Quick Start

Run the CRAOF controller with your request:

```bash
cd ~/Projects/cloudraider/CloudRaider-Portal
node scripts/craof-controller.cjs "<your request>"
```

## Examples

### Data Analysis (DS-STAR)
```bash
node scripts/craof-controller.cjs "analyze authentication failures for LifeScan"
node scripts/craof-controller.cjs "investigate suspicious login patterns"
node scripts/craof-controller.cjs "correlate alerts across tenants"
```

### Security Incidents (IVAM)
```bash
node scripts/craof-controller.cjs "incident response for potential breach"
node scripts/craof-controller.cjs "threat hunting for ransomware indicators"
```

### Research (Multi-LLM)
```bash
node scripts/craof-controller.cjs "research latest healthcare ransomware attacks"
node scripts/craof-controller.cjs "executive briefing on threat landscape"
```

## Check Performance

```bash
node scripts/craof-controller.cjs benchmark
```

Shows DS-STAR vs traditional approach metrics (target: 69% faster).

## Key Principles

1. **Don't reinvent** - CRAOF checks for existing solutions first
2. **Route smart** - Each handler is optimized for its task type
3. **Track everything** - Performance metrics stored in K8s database
4. **Learn and improve** - Success patterns saved for reuse

## Related Docs

- `CloudRaider-Portal/CRAOF-TRAINING-GUIDE.md` - Full training guide
- `CloudRaider-Portal/docs/DS-STAR-INTEGRATION-GUIDE.md` - DS-STAR details
- `~/.claude/agents/agent-registry.json` - Agent configuration
