# Intelligent Agent Loading - Full Reference

## Problem
50 agents loaded every session = 1,500 tokens, 70% never used

## Solution: 3-Tier Loading (69% token savings)

### Tier Structure

```
tier1-core/         # 12 agents (Always Load) - 95% of work
tier2-situational/  # 10 agents (Load on Demand) - Keywords trigger
tier3-specialized/  # 7 agents (Explicit Only) - Rare use
archive/            # 18 agents (Removed/Consolidated) - 0% usage
```

### Token Savings

| Strategy | Agents | Tokens | Savings |
|----------|--------|--------|---------|
| Before | 50 | 1,500 | 0% |
| Tier 1 Only | 12 | 360 | 76% |
| Weighted Avg | 12-15 | 461 | 69% |

### Session Detection (92% accuracy)

- **SOC Operations** (60%): incident, ransomware, threat → 8 agents
- **Customer Assessment** (20%): M365, compliance, audit → 8-9 agents
- **Development** (15%): React, TypeScript, feature → 5-6 agents
- **Executive Intelligence** (5%): executive, breach research → 4 agents

### Commands

```bash
node ~/.claude/agents/agent-loader.cjs detect "your task"
node ~/.claude/agents/agent-loader.cjs list
node ~/.claude/agents/agent-loader.cjs stats
/agents  # Claude Code slash command
```

### Files

- `agent-registry.json`
- `agent-loader.cjs`
- `docs/AGENT_OPTIMIZATION_COMPLETE.md`
