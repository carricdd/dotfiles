---
name: agent-capability-registry
description: Comprehensive registry of all available agents, their capabilities, integration points, and recommended use cases
title: Agent Capability Registry v2025.1
created: 2025-10-01
updated: 2025-10-01
version: 2025.1
status: production
---

# Agent Capability Registry

This registry provides a comprehensive overview of all available agents, their capabilities, integration points, and recommended use cases. Use this as your go-to reference for agent selection and orchestration.

## Quick Reference

### Agent Count Summary
- **Total Agents**: 47
- **Development**: 9 agents
- **Intelligence**: 9 agents
- **Infrastructure**: 7 agents
- **Security**: 6 agents
- **Operations**: 4 agents
- **Orchestration**: 3 agents
- **Monitoring**: 2 agents
- **Research**: 2 agents
- **Data**: 2 agents
- **Integration**: 1 agent
- **Quality**: 1 agent
- **Documentation**: 1 agent

---

## 🎯 Orchestration & Management

### orchestrator-prime
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Master multi-agent orchestrator managing distributed AI workflows
- Advanced optimization and self-improvement capabilities
- Coordinates all agent activities with intelligent task delegation
- **Use When**: Need to coordinate complex multi-agent workflows
- **Integrates With**: All agents
- **KPIs**: Task completion rate >95%, delegation accuracy >90%

### project-orchestrator
**Category**: Orchestration | **Model**: sonnet | **Maturity**: stable
- Practical project workflow orchestration
- Uses available Claude Code capabilities
- Focused on project-level coordination
- **Use When**: Managing specific project workflows
- **Integrates With**: Development agents, memory-persistence-agent

### content-orchestrator
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Multi-platform content capture and documentation
- Microsoft 365 and Google Workspace integration
- Knowledge management orchestration
- **Use When**: Need content management across platforms
- **Integrates With**: executive-assistant-ai, memory-persistence-agent

### playbook-intelligence-orchestrator
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Advanced playbook management system
- Performance measurement and optimization
- Organizational knowledge evolution
- **Use When**: Building and optimizing operational playbooks
- **Integrates With**: continuous-improvement-agent, pattern-recognition-agent

### mesh-intelligence-orchestrator
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Self-aware distributed mesh coordinator
- Dynamic resource discovery
- Autonomous mesh optimization
- **Use When**: Managing distributed computing resources
- **Integrates With**: resource-cluster-manager, mesh-discovery-coordinator

### mesh-discovery-coordinator
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Autonomous mesh discovery and health management
- Real-time node discovery
- Mesh topology optimization
- **Use When**: Need service discovery in distributed systems
- **Integrates With**: mesh-intelligence-orchestrator, agent-health-monitor

### distributed-load-balancer
**Category**: Orchestration | **Model**: opus | **Maturity**: production
- Advanced distributed load balancing
- Intelligent workload distribution
- Dynamic resource optimization
- **Use When**: Optimizing workload across mesh computing
- **Integrates With**: resource-cluster-manager, mesh-intelligence-orchestrator

---

## 💻 Development & Engineering

### fullstack-developer
**Category**: Development | **Model**: sonnet | **Maturity**: production
- End-to-end feature ownership
- Expertise across entire stack
- Complete solution delivery
- **Use When**: Need full-stack feature development
- **Integrates With**: frontend-developer, backend-developer, qa-automation-agent

### frontend-developer
**Category**: Development | **Model**: sonnet | **Maturity**: stable
- Expert UI engineer
- Robust, scalable frontend solutions
- Modern framework expertise
- **Use When**: Building user interfaces
- **Integrates With**: ui-designer, fullstack-developer

### backend-developer
**Category**: Development | **Model**: sonnet | **Maturity**: production
- Senior backend engineer
- Scalable API development
- Microservices architecture
- **Use When**: Building backend services and APIs
- **Integrates With**: api-designer, microservices-architect, database-orchestrator

### microservices-architect
**Category**: Development | **Model**: opus | **Maturity**: production
- Distributed systems architect
- Scalable microservice ecosystems
- Service mesh expertise
- **Use When**: Designing microservices architecture
- **Integrates With**: backend-developer, kubernetes-specialist

### api-designer
**Category**: Development | **Model**: sonnet | **Maturity**: stable
- Expert API architect
- RESTful and GraphQL design
- API contract definition
- **Use When**: Designing API interfaces
- **Integrates With**: backend-developer, qa-automation-agent

### ui-designer
**Category**: Development | **Model**: sonnet | **Maturity**: stable
- Expert visual designer
- Intuitive, accessible interfaces
- Design system creation
- **Use When**: Need UI/UX design expertise
- **Integrates With**: frontend-developer

### websocket-engineer
**Category**: Development | **Model**: sonnet | **Maturity**: production
- Expert WebSocket engineer
- Real-time communication systems
- Event-driven architecture
- **Use When**: Building real-time features
- **Integrates With**: backend-developer, fullstack-developer, devops-sre-agent

### ai-engineer
**Category**: Development | **Model**: opus | **Maturity**: production
- Expert AI system design
- Model implementation
- Production deployment
- **Use When**: Building AI/ML capabilities
- **Integrates With**: data-scientist, data-pipeline-agent

### data-scientist
**Category**: Development | **Model**: opus | **Maturity**: production
- Statistical analysis and machine learning
- Business insights generation
- Predictive modeling
- **Use When**: Data analysis and ML modeling
- **Integrates With**: data-pipeline-agent, ai-engineer

### mcp-developer
**Category**: Development | **Model**: sonnet | **Maturity**: production
- Expert MCP protocol specialist
- Server and client development
- AI system integrations
- **Use When**: Building MCP integrations
- **Integrates With**: mcp-protocol-manager

### platform-engineer
**Category**: Development | **Model**: opus | **Maturity**: production
- Internal developer platforms
- Developer experience optimization
- Platform tooling
- **Use When**: Building developer platforms
- **Integrates With**: devops-sre-agent, kubernetes-specialist

### qa-automation-agent ✨
**Category**: Development | **Model**: sonnet | **Maturity**: production
- Comprehensive test automation
- Quality gates enforcement
- TDD/BDD practices
- **Use When**: Need testing and quality assurance
- **Integrates With**: All development agents, devops-sre-agent
- **KPIs**: Coverage >80%, defect escape <5%, test execution <45min

### devops-sre-agent ✨
**Category**: Infrastructure | **Model**: sonnet | **Maturity**: production
- CI/CD pipeline engineering
- Site reliability engineering
- Infrastructure automation
- **Use When**: Need deployment and operations expertise
- **Integrates With**: qa-automation-agent, platform-engineer, kubernetes-specialist
- **KPIs**: Availability >99.9%, MTTR <1hr, deployment frequency daily

### data-pipeline-agent ✨
**Category**: Intelligence | **Model**: sonnet | **Maturity**: production
- ETL/ELT pipeline design
- Data quality management
- Stream processing
- **Use When**: Building data pipelines
- **Integrates With**: data-scientist, database-orchestrator, observability-agent
- **KPIs**: Pipeline success >99%, data quality >95%, freshness <15min

### technical-writer-agent ✨
**Category**: Development | **Model**: sonnet | **Maturity**: production
- Expert technical documentation
- API reference generation
- User guides and tutorials
- **Use When**: Creating comprehensive documentation
- **Integrates With**: api-designer, fullstack-developer, security-engineer
- **KPIs**: Doc coverage 100%, user satisfaction >4.5/5, support ticket reduction >20%

---

## 🔒 Security & Compliance

### security-engineer
**Category**: Security | **Model**: opus | **Maturity**: production
- Infrastructure security
- DevSecOps practices
- Cloud security and compliance
- **Use When**: Security implementation and auditing
- **Integrates With**: devops-sre-agent, trust-security-agent

### penetration-tester
**Category**: Security | **Model**: opus | **Maturity**: production
- Ethical hacking
- Security assessments
- Vulnerability discovery
- **Use When**: Security testing and validation
- **Integrates With**: security-engineer, security-frameworks

### trust-security-agent
**Category**: Security | **Model**: opus | **Maturity**: production
- Zero-trust security framework
- Authentication and authorization
- Trust management
- **Use When**: Implementing zero-trust architecture
- **Integrates With**: security-engineer, mcp-protocol-manager

### security-frameworks
**Category**: Security | **Model**: opus | **Maturity**: stable
- Compliance and security frameworks
- Enterprise risk and audit
- Standards implementation
- **Use When**: Compliance and framework implementation
- **Integrates With**: security-engineer, strategic-advisor-agent

### compliance-automation-agent ✨
**Category**: Security | **Model**: opus | **Maturity**: production
- **Metaframework specialist** for hybrid compliance programs (16+ frameworks)
- Core: SOC 2, ISO 27001, HIPAA, PCI-DSS, HITRUST, Spanish ENS
- NIST: CSF v1.1/v2.0 (migration), SSDF, CMMC v2.0, CJIS
- AppSec: OWASP Top 10, OWASP SAMM
- **CIS**: RAM (Risk Assessment), CSC v8 (Critical Security Controls)
- **Use When**: Multi-framework compliance, PE audits, criminal justice data (CJIS), risk register automation
- **Integrates With**: security-engineer, security-frameworks, devops-sre-agent, strategic-advisor-agent
- **KPIs**: Control overlap >50%, evidence automation >66%, cost reduction 30-50%
- **Special**: CGL-specific guidance (CJIS + CIS RAM + CIS CSC), risk register automation, policy review tracking
- **Special**: Unified control mapping, LifeScan template (HITRUST+ENS+PE), single evidence repository

---

## 🧠 Intelligence & Analytics

### observability-agent ✨
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Unified metrics, logs, traces
- Performance measurement
- KPI tracking and optimization
- **Use When**: Need comprehensive monitoring and analytics
- **Integrates With**: All agents for metrics collection
- **KPIs**: Dashboard latency <1s, alert response <5min, coverage 100%

### memory-persistence-agent ✨
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Cross-session knowledge continuity
- Hybrid file-based and vector storage
- Context restoration
- **Use When**: Need persistent memory across sessions
- **Integrates With**: All agents, orchestrator-prime
- **KPIs**: Restoration time <500ms, zero knowledge loss

### continuous-improvement-agent
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Self-evolution and optimization
- System adaptation
- Performance improvement
- **Use When**: Driving continuous improvement
- **Integrates With**: observability-agent, pattern-recognition-agent

### pattern-recognition-agent
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Cross-project learning
- Reusable pattern identification
- Optimization opportunities
- **Use When**: Discovering patterns and best practices
- **Integrates With**: knowledge-graph-agent, continuous-improvement-agent

### knowledge-graph-agent
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Cross-project learning systems
- Knowledge graph building
- Pattern reuse identification
- **Use When**: Building knowledge networks
- **Integrates With**: memory-persistence-agent, pattern-recognition-agent

### agent-health-monitor
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Real-time agent health monitoring
- Diagnostic systems
- Performance tracking
- **Use When**: Monitoring agent ecosystem health
- **Integrates With**: observability-agent, orchestrator-prime

### research-analyst
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Comprehensive information gathering
- Research synthesis
- Actionable intelligence
- **Use When**: Deep research and analysis needed
- **Integrates With**: strategic-advisor-agent, trend-analyst

### trend-analyst
**Category**: Intelligence | **Model**: opus | **Maturity**: stable
- Emerging pattern identification
- Future development forecasting
- Strategic foresight
- **Use When**: Analyzing trends and forecasting
- **Integrates With**: research-analyst, strategic-advisor-agent

### indydevdan
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- AI-assisted development thought leader
- Agentic workflows and automation
- Development philosophy
- **Use When**: Need automation and workflow insights
- **Integrates With**: continuous-improvement-agent, orchestrator-prime

### incident-response-agent ✨
**Category**: Intelligence | **Model**: opus | **Maturity**: production
- Complete incident lifecycle management
- War room coordination
- Automated runbook execution
- **Use When**: Managing incidents from detection to post-mortem
- **Integrates With**: observability-agent, devops-sre-agent, security-engineer
- **KPIs**: MTTR Sev1 <1hr, post-mortem completion 100%, repeat incidents <10%

### finops-agent ✨
**Category**: Intelligence | **Model**: sonnet | **Maturity**: production
- Cloud cost optimization
- Resource efficiency
- Reserved capacity management
- **Use When**: Optimizing cloud spending and resource utilization
- **Integrates With**: strategic-advisor-agent, devops-sre-agent, platform-engineer
- **KPIs**: Waste <5%, savings identified >15% annually, forecast accuracy ±10%

### customer-success-agent ✨
**Category**: Intelligence | **Model**: sonnet | **Maturity**: production
- Customer health monitoring
- Churn prediction and prevention
- Expansion opportunity identification
- **Use When**: Managing customer success and retention
- **Integrates With**: strategic-advisor-agent, observability-agent, incident-response-agent
- **KPIs**: Gross retention >95%, net retention >110%, NPS >50, expansion rate >25%

---

## 🎖️ Leadership & Strategy

### strategic-advisor-agent ✨
**Category**: Leadership | **Model**: opus | **Maturity**: production
- Unified C-suite strategic intelligence
- Technology, finance, operations, strategy
- Executive decision support
- **Use When**: Need executive-level strategic guidance
- **Integrates With**: All agents, executive-assistant-ai
- **KPIs**: Recommendation acceptance >85%, KPIs on track >90%

### executive-assistant-ai
**Category**: Leadership | **Model**: opus | **Maturity**: production
- Intelligence coordination
- Executive priorities management
- M365 and communication integration
- **Use When**: Managing executive communications and priorities
- **Integrates With**: strategic-advisor-agent, content-orchestrator

---

## 🏗️ Infrastructure & Protocols

### kubernetes-specialist
**Category**: Infrastructure | **Model**: opus | **Maturity**: production
- Container orchestration
- Cluster management
- Cloud-native architectures
- **Use When**: Kubernetes operations and optimization
- **Integrates With**: devops-sre-agent, platform-engineer

### mcp-protocol-manager
**Category**: Infrastructure | **Model**: opus | **Maturity**: production
- MCP/ACP communication protocols
- Standardized agent interoperability
- Protocol management
- **Use When**: Managing agent communication protocols
- **Integrates With**: mcp-developer, trust-security-agent

### resource-cluster-manager
**Category**: Infrastructure | **Model**: opus | **Maturity**: production
- Hardware-aware orchestration
- Distributed compute resources
- Self-aware resource optimization
- **Use When**: Managing distributed computing resources
- **Integrates With**: mesh-intelligence-orchestrator, distributed-load-balancer

---

## 📚 Research & Documentation

### cross-platform-deployment-research-2025
**Category**: Research | **Type**: Research Document
- Cross-platform deployment strategies
- Replication frameworks
- **Use When**: Planning cross-platform deployments
- **Reference Material**: Research findings and recommendations

### microsoft-google-integration-research-2025
**Category**: Research | **Type**: Research Document
- Microsoft 365 and Google Workspace integration
- Enterprise integration strategies
- **Use When**: Planning Microsoft/Google integrations
- **Reference Material**: Integration patterns and approaches

---

## 🔗 Integration Patterns

### Common Integration Points

**For Development Work:**
```yaml
typical_flow:
  1: fullstack-developer (or specialized dev agent)
  2: qa-automation-agent (testing)
  3: devops-sre-agent (deployment)
  4: observability-agent (monitoring)
```

**For Data Projects:**
```yaml
typical_flow:
  1: data-pipeline-agent (ETL/ELT)
  2: data-scientist (analysis)
  3: ai-engineer (ML models)
  4: observability-agent (monitoring)
```

**For Strategic Initiatives:**
```yaml
typical_flow:
  1: strategic-advisor-agent (strategy)
  2: research-analyst (research)
  3: orchestrator-prime (coordination)
  4: Specialized agents (execution)
```

**For Security Work:**
```yaml
typical_flow:
  1: security-engineer (implementation)
  2: penetration-tester (validation)
  3: security-frameworks (compliance)
  4: trust-security-agent (zero-trust)
```

---

## 🎯 Selection Guidelines

### Choose Based on Task Type

| Task Type | Primary Agent | Supporting Agents |
|-----------|--------------|-------------------|
| Full-stack feature | fullstack-developer | qa-automation-agent, devops-sre-agent |
| API design | api-designer | backend-developer, qa-automation-agent |
| Data pipeline | data-pipeline-agent | data-scientist, observability-agent |
| Infrastructure | devops-sre-agent | kubernetes-specialist, platform-engineer |
| Security audit | security-engineer | penetration-tester, security-frameworks |
| Strategic planning | strategic-advisor-agent | research-analyst, trend-analyst |
| Multi-agent workflow | orchestrator-prime | All relevant specialists |
| Testing & QA | qa-automation-agent | Development agents |
| Monitoring & metrics | observability-agent | agent-health-monitor |
| Knowledge management | memory-persistence-agent | knowledge-graph-agent |
| Documentation | technical-writer-agent | api-designer, fullstack-developer |
| Incident management | incident-response-agent | observability-agent, devops-sre-agent |
| Compliance & audit | compliance-automation-agent | security-engineer, security-frameworks |
| Cost optimization | finops-agent | strategic-advisor-agent, platform-engineer |
| Customer success | customer-success-agent | strategic-advisor-agent, observability-agent |

---

## 📊 Agent Maturity Levels

- **Production**: Battle-tested, comprehensive, ready for critical work
- **Stable**: Well-developed, reliable for standard use cases
- **Experimental**: Early stage, use with caution

### Production-Ready Agents (42)
All agents marked with ✨ plus most specialized agents

### Stable Agents (6)
frontend-developer, api-designer, ui-designer, security-frameworks, trend-analyst, project-orchestrator

### Experimental Agents (0)
All agents promoted to production or stable

---

## 🚀 Quick Start Recommendations

### For New Projects
1. Start with **orchestrator-prime** to coordinate
2. Add **strategic-advisor-agent** for planning
3. Include **devops-sre-agent** for infrastructure
4. Enable **observability-agent** from day one
5. Use **memory-persistence-agent** for continuity

### For Existing Projects
1. Assess with **research-analyst**
2. Optimize with **continuous-improvement-agent**
3. Monitor with **observability-agent**
4. Secure with **security-engineer**
5. Maintain with relevant specialist agents

---

## 📝 Version History

**v2025.3** (2025-10-12)
- Enhanced compliance-automation-agent to v2025.3 with **metaframework capabilities**
- Added Spanish ENS (Esquema Nacional de Seguridad) framework support
- Implemented unified hybrid compliance program design (HITRUST + ENS + PE Framework)
- Added control mapping methodology across 14+ frameworks with satisfaction matrices
- Created LifeScan healthcare template: 287 unified controls, 54% overlap, 44% cost reduction
- Added PE firm audit framework integration and exit readiness requirements
- Implemented multi-framework evidence automation (66%+ automated)
- Added medical device compliance integration (FDA 21 CFR Part 11, ISO 13485, MDR/IVDR)

**v2025.4** (2025-10-12)
- Enhanced compliance-automation-agent to v2025.4 with CIS RAM and CIS CSC v8
- Added CGL-specific compliance guidance (CJIS + CIS RAM + CIS CSC stack)
- Risk register automation: Annual reviews, continuous updates, sporadic→compliant roadmap
- Policy review automation: Mandatory annual reviews, 90/60/30 day reminders
- Dashboard transformation: Phase 1 (remove mock data), Phase 2 (automation), Phase 3 (intelligence)
- Total framework support: 16+ frameworks (added CIS RAM and CIS CSC v8)

**v2025.3** (Prior update)
- Metaframework design capabilities
- Spanish ENS, PE firm audits, medical device compliance
- Evidence automation >66%

**v2025.2** (2025-10-12)
- Added 5 critical agents: technical-writer, incident-response, compliance-automation, finops, customer-success
- Enhanced compliance-automation-agent with 13+ frameworks (NIST CSF v1/v2, CJIS, NIST SSDF, OWASP, OWASP SAMM, CMMC v2.0, HITRUST)
- Added NIST CSF v1.1→v2.0 migration guidance for compliance conversions
- Enhanced websocket-engineer from experimental to production
- Merged memory-resilience features into memory-persistence-agent
- Fixed orchestrator-prime agent name references
- Added integration contracts to all new agents
- Increased total agents from 43 to 48
- Updated maturity distribution: 42 production, 6 stable, 0 experimental

**v2025.1** (2025-10-01)
- Consolidated redundant agents (memory, metrics, C-suite)
- Added qa-automation-agent, devops-sre-agent, data-pipeline-agent
- Reduced from 52 to 43 agents
- Standardized agent metadata
- Improved categorization and integration clarity

---

## 🔍 Finding the Right Agent

**Use this decision tree:**

1. **What's the goal?**
   - Build something → Development agents
   - Analyze something → Intelligence agents
   - Secure something → Security agents
   - Deploy something → Infrastructure agents
   - Decide something → Leadership agents
   - Coordinate something → Orchestration agents

2. **What's the scope?**
   - Single task → Specialist agent
   - Multiple tasks → orchestrator-prime + specialists
   - Strategic → strategic-advisor-agent + specialists

3. **What's the priority?**
   - Speed → Use production-maturity agents
   - Innovation → Experimental agents acceptable
   - Reliability → Production + observability-agent

**When in doubt, start with orchestrator-prime** - it will delegate appropriately.

---

*This registry is maintained by the continuous-improvement-agent and updated as the agent ecosystem evolves.*
