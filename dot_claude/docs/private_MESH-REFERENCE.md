# Distributed Mesh Computing - Full Reference

## Node Details

| Node | SSH | Cores | RAM | GPU | Status |
|------|-----|-------|-----|-----|--------|
| mac01 | localhost | 10 | 24GB | - | Control |
| mac00 | `ssh mac00` | 16 | 64GB | M3 Max 40-core | Active |
| mac03 | `ssh mac03` | 16 | 64GB | AMD 5500M | Active |
| loki | `ssh loki` | 16 | 64GB | RTX 4070 12GB | Active |
| ymir | `ssh ymir` | 24 | 64GB | RTX 4060 8GB | Active |
| vultr | `ssh vultr` | 4 | 8GB | - | Active |

**Total**: 90 cores | 296GB RAM | 3 GPUs | $90/month

## Task Routing

- **CUDA GPU** → loki (RTX 4070) or ymir
- **Apple GPU/ML** → mac00 (M3 Max 40-core)
- **Heavy CPU** → ymir (24 cores), else mac00/mac03
- **Quick tasks** → mac01 (control, lowest latency)
- **Cloud/public** → vultr or K8s

## Kubernetes

```bash
kubectl config use-context vke-a99b9f40-2f69-4360-9145-0c97d7d84085
```

## Commands

```bash
node ~/.claude/mesh/health-check.cjs        # Check all nodes
node ~/.claude/mesh/health-check.cjs quick  # Quick connectivity
node ~/.claude/mesh/health-check.cjs update # Update topology.json
```
