---
name: tier3-specialized-readme
description: Directory documentation
---
# Tier 3: Specialized Agents (Explicit Load Only)

**Usage**: <20% of sessions
**Token Cost**: ~210 tokens (if all loaded)
**Weighted Cost**: ~11 tokens (5% average usage)

## Specialized Agents (7)

1. **kubernetes-specialist** - K8s, container orchestration
2. **mcp-protocol-manager** - Agent communication protocol
3. **finops-agent** - Cost optimization, cloud spending
4. **frontend-dev** - React, UI components
5. **backend-dev** - API design, backend architecture
6. **api-designer** - OpenAPI, GraphQL
7. **microservices-dev** - Microservices architecture

**Load Triggers**:
- "kubernetes", "k8s" → kubernetes-specialist
- "MCP", "agent protocol" → mcp-protocol-manager
- "cost optimization" → finops-agent
- Explicit UI work → frontend-dev

**Last Updated**: 2025-10-28
