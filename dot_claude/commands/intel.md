# Comprehensive Threat Intelligence Update

Execute a full threat intelligence collection cycle:

## Phase 1: Check Current State
- Query database for last update time by source
- Report staleness (hours since last update)
- Identify which sources need refresh

## Phase 2: Pull from ALL Sources
Run comprehensive collection from all 8 API sources:
- ransomware.live (victims + threat actors)
- ThreatFox (IOCs: IPs, domains, hashes, URLs)
- AlienVault OTX (threat pulses + IOCs)
- AbuseIPDB (malicious IPs)
- GreyNoise (internet scanner detection)
- LeakIX (infrastructure leaks)
- LeakLookup (executive breach monitoring)
- C99 (OSINT reconnaissance)

## Phase 3: Executive Research
For each customer in database:
- Query executives table
- Research each executive via LeakLookup API
- Check for breach exposure (email in HaveIBeenPwned, etc.)
- Update executive_breach_intelligence table
- Alert if new breaches found since last check

## Phase 4: Cross-Reference & Correlation
- Cross-reference victims across sources (multi-source = high confidence)
- Correlate with customer industries (threat actor + industry match = alert)
- Enrich IOCs with VirusTotal (file hashes) and GreyNoise (IPs)
- Update threat actor profiles with latest intelligence

## Phase 5: Report Results
Generate summary:
- Total records pulled by source
- New victims discovered
- New IOCs added
- Executive breaches found
- Customer-relevant threats identified
- Source health status (✅ healthy, ⚠️ stale, 🔴 broken)

## Expected Execution Time
- Phase 1: 10 seconds (database queries)
- Phase 2: 2-3 minutes (API calls with respectful delays)
- Phase 3: 1-2 minutes (executive research)
- Phase 4: 30-60 seconds (correlation)
- Phase 5: 10 seconds (reporting)
**Total: 4-6 minutes**

## Files to Execute
1. `scripts/diagnose-threat-intel-health.cjs` - Check current state
2. `scripts/pull-ALL-threat-intel.cjs` - Comprehensive collection
3. `scripts/research-customer-executives.cjs` - Executive monitoring
4. `scripts/correlate-threat-intel.cjs` - Cross-reference intelligence
5. `scripts/generate-intel-update-report.cjs` - Summary report

## Success Criteria
- ✅ All 8 sources pulled successfully
- ✅ Database updated with new records
- ✅ Executive profiles current (last 24 hours)
- ✅ No sources stale >6 hours
- ✅ Customer correlations identified

## Usage
```
/intel
```

This command should be run:
- **Daily**: Automated via cron at 12am, 6am, 12pm, 6pm
- **On-Demand**: When starting customer investigation
- **After Major Event**: New ransomware campaign, data breach announcement, etc.
