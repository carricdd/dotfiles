# CloudRaider Mesh Infrastructure

**Version**: 3.0 Consolidated
**Last Updated**: 2025-11-26
**Status**: SINGLE SOURCE OF TRUTH

---

## Quick Reference

```
TOTAL ACTIVE:  66 cores | 232GB RAM | 2 GPUs | $90/month
TOTAL POTENTIAL: 90 cores | 296GB RAM | 3 GPUs (when ymir online)
CLOUD EQUIVALENT: $6,400/month = $75,720/year savings
```

## Active Nodes (6)

| Node | SSH Command | Cores | RAM | GPU | Role |
|------|-------------|-------|-----|-----|------|
| mac01 | (localhost) | 10 | 24GB | - | Control |
| mac00 | `ssh mac00` | 16 | 64GB | M3 Max 40-core | Heavy AI/ML |
| mac03 | `ssh mac03` | 16 | 64GB | AMD 5500M | General |
| loki | `ssh loki` | 16 | 64GB | RTX 4070 12GB | CUDA |
| cr-vultr01 | `ssh vultr` | 4 | 8GB | - | Cloud |
| K8s (2 nodes) | kubectl | 4 | 8GB | - | Containers |

## Offline Nodes (1)

| Node | SSH Command | Cores | RAM | GPU | Notes |
|------|-------------|-------|-----|-----|-------|
| ymir | `ssh ymir` | 24 | 64GB | RTX 4060 8GB | Bring online on request |

## Task Routing

- **CUDA GPU work** → loki (RTX 4070, 4608 CUDA cores)
- **Apple GPU/ML** → mac00 (M3 Max, 40-core GPU)
- **Heavy CPU** → ymir (24 cores) when online, else mac00/mac03
- **Quick tasks** → mac01 (control, lowest latency)
- **Cloud/public** → cr-vultr01 or K8s
- **Containers** → K8s cluster

## Common Commands

```bash
# Test mesh connectivity
node ~/.claude/mesh/health-check.cjs

# Distributed sandbox orchestrator
cd ~/Projects/cloudraider/CloudRaider-Portal/modules/distributed-sandbox-orchestrator
node index.cjs status
node index.cjs test
node distributed-mesh-orchestrator.cjs parallel

# K8s cluster
kubectl config use-context vke-a99b9f40-2f69-4360-9145-0c97d7d84085
kubectl get pods -n cloudraider
```

## SSH Config Required

Add to `~/.ssh/config`:
```
Host mac00
  HostName mac00.local
  User carric

Host mac03
  HostName 192.168.0.24
  User carric

Host loki
  HostName 192.168.0.250
  User admin

Host ymir
  HostName 192.168.0.74
  User admin

Host vultr
  HostName 155.138.199.82
  User carric
```

## Files

- `topology.json` - Complete node specifications (SINGLE SOURCE OF TRUTH)
- `health-check.cjs` - Verify node status
- `README.md` - This file

## History

This consolidates three previous files that had version drift:
- `~/.claude/MESH_GOSPEL.md` (Oct 15, 2025) → ARCHIVED
- `~/.claude/mesh_topology_permanent.json` (Oct 20, 2025) → ARCHIVED
- `modules/distributed-sandbox-orchestrator/MESH-INFRASTRUCTURE.md` (Nov 24) → SUPERSEDED

**DO NOT create new mesh documentation files.** Update `topology.json` only.
