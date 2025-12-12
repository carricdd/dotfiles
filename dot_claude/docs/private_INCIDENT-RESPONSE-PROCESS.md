# CloudRaider Incident Response Documentation Process

**Version**: 1.0 | **Created**: 2025-12-09

---

## Purpose

This document establishes the process for capturing investigation activities in real-time during incident response engagements. The goal is to create a running log that enables rapid report generation once containment is achieved.

---

## Investigation Log Format

During active incidents, maintain a running log file:

```
/Users/carric/Library/CloudStorage/OneDrive-CloudRaiderLLC/Projects/WON/{CLIENT}/investigation-log.md
```

### Log Entry Template

```markdown
## [TIMESTAMP] - [CATEGORY]

**Action**: What was done
**Theory**: Why we did it / what we were looking for
**Finding**: What we discovered
**Next Step**: What this leads us to investigate next

### Commands Executed
```bash
# Actual commands run
```

### Evidence Collected
- File/screenshot/export name and location

### Notes
- Additional context, theories, dead ends
```

### Categories
- `INITIAL` - First engagement, scope definition
- `RECON` - Discovery and reconnaissance
- `CONTAINMENT` - Active containment actions
- `FORENSICS` - Evidence collection and analysis
- `REMEDIATION` - Fix actions taken
- `THEORY` - Working hypotheses
- `TIMELINE` - Attack timeline reconstruction
- `IOC` - Indicators of compromise identified

---

## During the Incident

### Priority Order
1. **Contain the threat** - Stop the bleeding first
2. **Log as you go** - Even brief notes help
3. **Screenshot everything** - Before making changes
4. **Export raw data** - Preserve evidence

### Minimum Capture Per Action
- Timestamp
- What you did
- What you found
- Screenshot or export if possible

### Quick Entry Format (When Under Pressure)
```markdown
## 2025-12-09 14:30 - CONTAINMENT
Disabled user account jsmith@client.com - suspected compromised
Found 47 failed logins from TOR exit node 185.x.x.x
```

---

## Report Generation

### HTML Dashboard Reports (Preferred)
- CloudRaider delivers HTML-based investigation reports
- Template location: `~/.claude/templates/ir-report-template.html`
- Print to PDF for client delivery
- Advantages: Interactive, visual, easy to update, Claude excels at HTML generation

### Report Sections (Standard)
1. Executive Summary (breach confirmation, attribution, outcome, regulatory)
2. Engagement Details
3. Initial Findings
4. Key Metrics
5. Attack Timeline
6. Post-Incident Alert Summary
7. Identity/Access Analysis
8. Network Security Findings
9. Detection Gaps Analysis
10. Business Impact Assessment
11. Remediation Actions
12. Recommendations
13. Appendix: MITRE ATT&CK Mapping
14. Appendix: Technical IOCs

---

## Post-Incident

### Within 24 Hours of Containment
- [ ] Complete investigation log
- [ ] Fill gaps in timeline
- [ ] Verify all evidence preserved
- [ ] Begin report draft

### Report Delivery Target
- Draft report within 48-72 hours of containment
- Final report within 1 week

---

## Claude Code Integration

When starting an incident response session, tell Claude:
```
Starting IR engagement for [CLIENT]. Create investigation log at
/Users/carric/Library/CloudStorage/OneDrive-CloudRaiderLLC/Projects/WON/[CLIENT]/investigation-log.md
and log every action we take.
```

Claude will:
- Create the log file
- Append entries as you work
- Preserve commands, outputs, and findings
- Generate the final report from the log

---

## Lessons Learned (Elevos Incident)

Issues encountered:
- Investigation notes scattered across sessions
- Had to reconstruct timeline from memory
- Stress of containment prevented documentation
- Report generation delayed due to missing details

Improvements implemented:
- This process document
- HTML report template
- Running log requirement
- Claude integration for automatic logging
