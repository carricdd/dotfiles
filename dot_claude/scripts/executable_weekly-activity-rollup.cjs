#!/usr/bin/env node
/**
 * Weekly Activity Rollup v1.0
 *
 * Aggregates daily activity reports into weekly summaries
 * with trends, comparisons, and insights.
 *
 * Usage: node ~/.claude/scripts/weekly-activity-rollup.cjs [week-start-date]
 *        week-start-date format: YYYY-MM-DD (defaults to current week's Monday)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOGS_DIR = path.join(os.homedir(), '.claude/activity-logs');

class WeeklyRollup {
    constructor(weekStartDate = null) {
        this.weekStart = this.getWeekStart(weekStartDate);
        this.weekEnd = new Date(this.weekStart);
        this.weekEnd.setDate(this.weekEnd.getDate() + 6);
    }

    getWeekStart(dateStr) {
        let date;
        if (dateStr) {
            date = new Date(dateStr);
        } else {
            date = new Date();
        }
        // Get Monday of the week
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        date.setDate(diff);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    formatDate(date) {
        return date.toISOString().split('T')[0];
    }

    getDatesInWeek() {
        const dates = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(this.weekStart);
            d.setDate(d.getDate() + i);
            dates.push(this.formatDate(d));
        }
        return dates;
    }

    loadDailyReports() {
        const dates = this.getDatesInWeek();
        const reports = {};

        for (const date of dates) {
            const filePath = path.join(LOGS_DIR, `${date}.json`);
            if (fs.existsSync(filePath)) {
                try {
                    reports[date] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                } catch (err) {
                    console.warn(`Warning: Could not parse ${date}.json`);
                }
            }
        }

        return reports;
    }

    generateRollup() {
        const reports = this.loadDailyReports();
        const dates = this.getDatesInWeek();
        const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

        // Initialize aggregates
        const totals = {
            trackedMinutes: 0,
            productiveMinutes: 0,
            communicationMinutes: 0,
            phoneMinutes: 0,
            claudeMessages: 0,
            claudeSessions: 0,
            daysTracked: 0
        };

        const byCategory = {};
        const byApp = {};
        const dailyBreakdown = [];

        // Aggregate each day
        for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const report = reports[date];
            const dayName = dayNames[i];

            if (report && report.metrics) {
                totals.daysTracked++;
                totals.trackedMinutes += report.metrics.totalTrackedMinutes || 0;
                totals.productiveMinutes += report.metrics.productiveMinutes || 0;
                totals.communicationMinutes += report.metrics.communicationMinutes || 0;
                totals.phoneMinutes += report.metrics.phoneMinutes || 0;
                totals.claudeMessages += report.metrics.claudeCodeMessages || 0;
                totals.claudeSessions += report.metrics.claudeCodeSessions || 0;

                // By category
                for (const cat of (report.byCategory || [])) {
                    if (!byCategory[cat.category]) {
                        byCategory[cat.category] = { label: cat.label, minutes: 0, sessions: 0 };
                    }
                    byCategory[cat.category].minutes += cat.minutes || 0;
                    byCategory[cat.category].sessions += cat.sessions || 0;
                }

                // By app
                for (const app of (report.topApps || [])) {
                    if (!byApp[app.name]) {
                        byApp[app.name] = { category: app.category, minutes: 0, sessions: 0 };
                    }
                    byApp[app.name].minutes += app.minutes || 0;
                    byApp[app.name].sessions += app.sessions || 0;
                }

                dailyBreakdown.push({
                    date,
                    dayName,
                    hours: Math.round(report.metrics.totalTrackedMinutes / 60 * 10) / 10,
                    productive: Math.round(report.metrics.productiveMinutes / 60 * 10) / 10,
                    communication: Math.round(report.metrics.communicationMinutes / 60 * 10) / 10,
                    claudeMessages: report.metrics.claudeCodeMessages || 0
                });
            } else {
                dailyBreakdown.push({
                    date,
                    dayName,
                    hours: 0,
                    productive: 0,
                    communication: 0,
                    claudeMessages: 0,
                    missing: true
                });
            }
        }

        // Build rollup
        const rollup = {
            weekStart: this.formatDate(this.weekStart),
            weekEnd: this.formatDate(this.weekEnd),
            generatedAt: new Date().toISOString(),
            summary: {
                daysTracked: totals.daysTracked,
                totalHours: Math.round(totals.trackedMinutes / 60 * 10) / 10,
                avgHoursPerDay: totals.daysTracked > 0
                    ? Math.round(totals.trackedMinutes / totals.daysTracked / 60 * 10) / 10
                    : 0,
                productiveHours: Math.round(totals.productiveMinutes / 60 * 10) / 10,
                productivePercent: totals.trackedMinutes > 0
                    ? Math.round(totals.productiveMinutes / totals.trackedMinutes * 100)
                    : 0,
                communicationHours: Math.round(totals.communicationMinutes / 60 * 10) / 10,
                communicationPercent: totals.trackedMinutes > 0
                    ? Math.round(totals.communicationMinutes / totals.trackedMinutes * 100)
                    : 0,
                phoneHours: Math.round(totals.phoneMinutes / 60 * 10) / 10,
                claudeMessages: totals.claudeMessages,
                claudeSessions: totals.claudeSessions
            },
            dailyBreakdown,
            byCategory: Object.entries(byCategory)
                .map(([cat, data]) => ({ category: cat, ...data, hours: Math.round(data.minutes / 60 * 10) / 10 }))
                .sort((a, b) => b.minutes - a.minutes),
            topApps: Object.entries(byApp)
                .map(([name, data]) => ({ name, ...data, hours: Math.round(data.minutes / 60 * 10) / 10 }))
                .sort((a, b) => b.minutes - a.minutes)
                .slice(0, 15)
        };

        // Save rollup
        const outputPath = path.join(LOGS_DIR, `week-${rollup.weekStart}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(rollup, null, 2));

        this.printRollup(rollup);

        return rollup;
    }

    printRollup(rollup) {
        const s = rollup.summary;

        console.log('\n' + '═'.repeat(70));
        console.log(`  WEEKLY ACTIVITY ROLLUP: ${rollup.weekStart} to ${rollup.weekEnd}`);
        console.log('═'.repeat(70));

        console.log(`\n📊 WEEK SUMMARY`);
        console.log('─'.repeat(50));
        console.log(`  Days tracked:          ${s.daysTracked}/7`);
        console.log(`  Total hours:           ${s.totalHours}h`);
        console.log(`  Average per day:       ${s.avgHoursPerDay}h`);
        console.log(`  Productive time:       ${s.productiveHours}h (${s.productivePercent}%)`);
        console.log(`  Communication time:    ${s.communicationHours}h (${s.communicationPercent}%)`);
        if (s.phoneHours > 0) {
            console.log(`  Phone calls:           ${s.phoneHours}h`);
        }

        console.log(`\n🤖 CLAUDE CODE USAGE`);
        console.log('─'.repeat(50));
        console.log(`  Total sessions:        ${s.claudeSessions}`);
        console.log(`  Total messages:        ${s.claudeMessages}`);
        console.log(`  Avg messages/day:      ${s.daysTracked > 0 ? Math.round(s.claudeMessages / s.daysTracked) : 0}`);

        console.log(`\n📅 DAILY BREAKDOWN`);
        console.log('─'.repeat(50));
        console.log('  Day   | Total | Productive | Comms | Claude');
        console.log('  ' + '─'.repeat(46));
        for (const day of rollup.dailyBreakdown) {
            if (day.missing) {
                console.log(`  ${day.dayName}   |   -   |     -      |   -   |   -`);
            } else {
                const bar = '█'.repeat(Math.min(Math.round(day.hours / 2), 10));
                console.log(`  ${day.dayName}   | ${String(day.hours).padStart(4)}h | ${String(day.productive).padStart(5)}h      | ${String(day.communication).padStart(4)}h | ${String(day.claudeMessages).padStart(4)} msgs  ${bar}`);
            }
        }

        console.log(`\n📱 TIME BY CATEGORY`);
        console.log('─'.repeat(50));
        for (const cat of rollup.byCategory.slice(0, 7)) {
            const bar = '█'.repeat(Math.min(Math.round(cat.hours / 2), 15));
            console.log(`  ${(cat.label || cat.category).padEnd(28)} ${String(cat.hours).padStart(5)}h ${bar}`);
        }

        console.log(`\n🏆 TOP APPS`);
        console.log('─'.repeat(50));
        for (const app of rollup.topApps.slice(0, 10)) {
            console.log(`  ${app.name.padEnd(28)} ${String(app.hours).padStart(5)}h (${app.sessions} sessions)`);
        }

        console.log('\n' + '═'.repeat(70));
        console.log(`  Report saved to: ~/.claude/activity-logs/week-${rollup.weekStart}.json`);
        console.log('═'.repeat(70) + '\n');
    }
}

// CLI
if (require.main === module) {
    const weekStart = process.argv[2] || null;
    const rollup = new WeeklyRollup(weekStart);
    rollup.generateRollup();
}

module.exports = WeeklyRollup;
