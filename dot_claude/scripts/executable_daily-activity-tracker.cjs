#!/usr/bin/env node
/**
 * Daily Activity Tracker v1.0
 *
 * Tracks app usage from macOS Knowledge database,
 * extracts Claude Code session topics, and generates
 * daily productivity reports.
 *
 * Usage: node ~/.claude/scripts/daily-activity-tracker.cjs [date]
 *        date format: YYYY-MM-DD (defaults to today)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths
const KNOWLEDGE_DB = path.join(os.homedir(), 'Library/Application Support/Knowledge/knowledgeC.db');
const HISTORY_FILE = path.join(os.homedir(), '.claude/history.jsonl');
const OUTPUT_DIR = path.join(os.homedir(), '.claude/activity-logs');

// App category mappings
const APP_CATEGORIES = {
    // Development / Claude Code
    'com.apple.Terminal': { name: 'Terminal (Claude Code)', category: 'development' },
    'com.microsoft.VSCode': { name: 'VS Code', category: 'development' },
    'com.sublimetext.4': { name: 'Sublime Text', category: 'development' },

    // Communication
    'com.microsoft.Outlook': { name: 'Outlook', category: 'communication' },
    'com.microsoft.teams2': { name: 'Teams', category: 'communication' },
    'com.microsoft.teams': { name: 'Teams (Classic)', category: 'communication' },
    'org.whispersystems.signal-desktop': { name: 'Signal', category: 'communication' },
    'com.apple.MobileSMS': { name: 'iMessage', category: 'communication' },
    'com.tinyspeck.slackmacgap': { name: 'Slack', category: 'communication' },
    'us.zoom.xos': { name: 'Zoom', category: 'communication' },

    // Research / Browsers
    'com.google.Chrome': { name: 'Chrome', category: 'research' },
    'com.apple.Safari': { name: 'Safari', category: 'research' },
    'com.microsoft.edgemac': { name: 'Edge', category: 'research' },
    'org.mozilla.firefox': { name: 'Firefox', category: 'research' },

    // Documents / Office
    'com.microsoft.Word': { name: 'Word', category: 'documents' },
    'com.microsoft.Excel': { name: 'Excel', category: 'documents' },
    'com.microsoft.Powerpoint': { name: 'PowerPoint', category: 'documents' },
    'com.apple.iWork.Pages': { name: 'Pages', category: 'documents' },
    'com.apple.iWork.Numbers': { name: 'Numbers', category: 'documents' },
    'com.apple.iWork.Keynote': { name: 'Keynote', category: 'documents' },
    'com.apple.Preview': { name: 'Preview', category: 'documents' },

    // AI Tools
    'com.openai.atlas': { name: 'ChatGPT', category: 'ai_tools' },

    // System / Admin
    'com.apple.finder': { name: 'Finder', category: 'system' },
    'com.apple.systempreferences': { name: 'System Settings', category: 'system' },
    'com.apple.ActivityMonitor': { name: 'Activity Monitor', category: 'system' },

    // Media / Break
    'com.spotify.client': { name: 'Spotify', category: 'break' },
    'com.apple.Music': { name: 'Music', category: 'break' },
    'com.apple.TV': { name: 'TV', category: 'break' },
};

const CATEGORY_LABELS = {
    development: 'Development & Claude Code',
    communication: 'Communication',
    research: 'Research & Browsing',
    documents: 'Documents & Office',
    ai_tools: 'AI Tools',
    system: 'System & Admin',
    break: 'Breaks & Media',
    other: 'Other'
};

class DailyActivityTracker {
    constructor(targetDate = null) {
        this.targetDate = targetDate || new Date().toISOString().split('T')[0];
        this.ensureOutputDir();
    }

    ensureOutputDir() {
        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }
    }

    // Query macOS Knowledge database for app usage
    getAppUsage() {
        const query = `
            SELECT
                ZVALUESTRING as app,
                datetime(ZSTARTDATE+978307200,'unixepoch','localtime') as started,
                datetime(ZENDDATE+978307200,'unixepoch','localtime') as ended,
                (ZENDDATE-ZSTARTDATE) as duration_seconds
            FROM ZOBJECT
            WHERE ZSTREAMNAME='/app/usage'
                AND date(ZSTARTDATE+978307200,'unixepoch','localtime') = '${this.targetDate}'
            ORDER BY ZSTARTDATE ASC;
        `;

        try {
            const result = execSync(`sqlite3 -json "${KNOWLEDGE_DB}" "${query}"`, {
                encoding: 'utf-8',
                maxBuffer: 10 * 1024 * 1024
            });
            return JSON.parse(result || '[]');
        } catch (err) {
            console.error('Error querying Knowledge DB:', err.message);
            return [];
        }
    }

    // Get Claude Code session topics from history
    getClaudeTopics() {
        if (!fs.existsSync(HISTORY_FILE)) {
            return [];
        }

        try {
            const lines = fs.readFileSync(HISTORY_FILE, 'utf-8').split('\n').filter(Boolean);
            const todayStart = new Date(this.targetDate).getTime();
            const todayEnd = todayStart + 24 * 60 * 60 * 1000;

            const sessions = {};

            for (const line of lines) {
                try {
                    const entry = JSON.parse(line);
                    let ts = entry.timestamp;
                    if (ts > 1000000000000) ts = ts; // already ms
                    else ts = ts * 1000; // convert to ms

                    if (ts >= todayStart && ts < todayEnd) {
                        const sessionId = entry.sessionId || 'unknown';
                        if (!sessions[sessionId]) {
                            sessions[sessionId] = {
                                messages: [],
                                firstMessage: ts,
                                lastMessage: ts,
                                project: entry.project || 'unknown'
                            };
                        }
                        sessions[sessionId].messages.push(entry.display?.slice(0, 200) || '');
                        sessions[sessionId].lastMessage = Math.max(sessions[sessionId].lastMessage, ts);
                    }
                } catch (e) {
                    // Skip malformed lines
                }
            }

            // Extract topics from first few messages of each session
            return Object.entries(sessions).map(([id, data]) => {
                const duration = Math.round((data.lastMessage - data.firstMessage) / 60000);
                const topicHints = data.messages.slice(0, 3).join(' ').slice(0, 300);

                return {
                    sessionId: id.slice(0, 8),
                    project: path.basename(data.project),
                    messageCount: data.messages.length,
                    durationMinutes: duration,
                    startTime: new Date(data.firstMessage).toLocaleTimeString(),
                    topicHints: topicHints
                };
            });
        } catch (err) {
            console.error('Error reading Claude history:', err.message);
            return [];
        }
    }

    // Aggregate app usage by category
    aggregateByCategory(appUsage) {
        const byApp = {};
        const byCategory = {};
        const timeline = [];

        for (const entry of appUsage) {
            const appId = entry.app;
            const mapping = APP_CATEGORIES[appId] || { name: appId, category: 'other' };
            const minutes = Math.round(entry.duration_seconds / 60 * 10) / 10;

            // By app
            if (!byApp[mapping.name]) {
                byApp[mapping.name] = { minutes: 0, sessions: 0, category: mapping.category };
            }
            byApp[mapping.name].minutes += minutes;
            byApp[mapping.name].sessions += 1;

            // By category
            if (!byCategory[mapping.category]) {
                byCategory[mapping.category] = { minutes: 0, sessions: 0 };
            }
            byCategory[mapping.category].minutes += minutes;
            byCategory[mapping.category].sessions += 1;

            // Timeline (for significant entries > 1 min)
            if (minutes >= 1) {
                timeline.push({
                    time: entry.started.split(' ')[1],
                    app: mapping.name,
                    category: mapping.category,
                    minutes: minutes
                });
            }
        }

        // Round totals
        for (const app of Object.values(byApp)) {
            app.minutes = Math.round(app.minutes);
        }
        for (const cat of Object.values(byCategory)) {
            cat.minutes = Math.round(cat.minutes);
        }

        return { byApp, byCategory, timeline };
    }

    // Calculate productivity metrics
    calculateMetrics(byCategory, claudeTopics) {
        const totalMinutes = Object.values(byCategory).reduce((sum, c) => sum + c.minutes, 0);
        const productiveCategories = ['development', 'documents', 'ai_tools'];
        const productiveMinutes = productiveCategories.reduce(
            (sum, cat) => sum + (byCategory[cat]?.minutes || 0), 0
        );
        const commMinutes = byCategory.communication?.minutes || 0;
        const breakMinutes = byCategory.break?.minutes || 0;

        const claudeMinutes = claudeTopics.reduce((sum, s) => sum + s.durationMinutes, 0);
        const claudeMessages = claudeTopics.reduce((sum, s) => sum + s.messageCount, 0);

        return {
            totalTrackedMinutes: totalMinutes,
            totalTrackedHours: Math.round(totalMinutes / 60 * 10) / 10,
            productiveMinutes,
            productivePercent: totalMinutes > 0 ? Math.round(productiveMinutes / totalMinutes * 100) : 0,
            communicationMinutes: commMinutes,
            communicationPercent: totalMinutes > 0 ? Math.round(commMinutes / totalMinutes * 100) : 0,
            breakMinutes,
            claudeCodeMinutes: claudeMinutes,
            claudeCodeMessages: claudeMessages,
            claudeCodeSessions: claudeTopics.length
        };
    }

    // Generate the daily report
    generateReport() {
        console.log(`\n📊 Generating activity report for ${this.targetDate}...\n`);

        const appUsage = this.getAppUsage();
        const claudeTopics = this.getClaudeTopics();
        const { byApp, byCategory, timeline } = this.aggregateByCategory(appUsage);
        const metrics = this.calculateMetrics(byCategory, claudeTopics);

        const report = {
            date: this.targetDate,
            generatedAt: new Date().toISOString(),
            metrics,
            byCategory: Object.entries(byCategory)
                .map(([cat, data]) => ({
                    category: cat,
                    label: CATEGORY_LABELS[cat] || cat,
                    ...data
                }))
                .sort((a, b) => b.minutes - a.minutes),
            topApps: Object.entries(byApp)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.minutes - a.minutes)
                .slice(0, 15),
            claudeSessions: claudeTopics,
            timeline: timeline.slice(-50) // Last 50 significant app switches
        };

        // Save to file
        const outputPath = path.join(OUTPUT_DIR, `${this.targetDate}.json`);
        fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
        console.log(`✅ Report saved to: ${outputPath}\n`);

        // Print summary
        this.printSummary(report);

        return report;
    }

    printSummary(report) {
        const m = report.metrics;

        console.log('═'.repeat(60));
        console.log(`  DAILY ACTIVITY REPORT: ${report.date}`);
        console.log('═'.repeat(60));

        console.log(`\n📈 OVERVIEW`);
        console.log('─'.repeat(40));
        console.log(`  Total tracked time:    ${m.totalTrackedHours} hours (${m.totalTrackedMinutes} min)`);
        console.log(`  Productive time:       ${Math.round(m.productiveMinutes/60*10)/10} hours (${m.productivePercent}%)`);
        console.log(`  Communication time:    ${Math.round(m.communicationMinutes/60*10)/10} hours (${m.communicationPercent}%)`);

        console.log(`\n🤖 CLAUDE CODE`);
        console.log('─'.repeat(40));
        console.log(`  Sessions:              ${m.claudeCodeSessions}`);
        console.log(`  Messages exchanged:    ${m.claudeCodeMessages}`);
        console.log(`  Active time:           ${Math.round(m.claudeCodeMinutes/60*10)/10} hours`);

        console.log(`\n📱 TIME BY CATEGORY`);
        console.log('─'.repeat(40));
        for (const cat of report.byCategory) {
            const hours = Math.round(cat.minutes / 60 * 10) / 10;
            const bar = '█'.repeat(Math.min(Math.round(cat.minutes / 30), 20));
            console.log(`  ${cat.label.padEnd(25)} ${String(hours).padStart(4)}h ${bar}`);
        }

        console.log(`\n🏆 TOP APPS`);
        console.log('─'.repeat(40));
        for (const app of report.topApps.slice(0, 8)) {
            const hours = Math.round(app.minutes / 60 * 10) / 10;
            console.log(`  ${app.name.padEnd(25)} ${String(hours).padStart(4)}h (${app.sessions} sessions)`);
        }

        if (report.claudeSessions.length > 0) {
            console.log(`\n💬 CLAUDE SESSIONS`);
            console.log('─'.repeat(40));
            for (const session of report.claudeSessions.slice(0, 5)) {
                console.log(`  ${session.startTime} | ${session.project} | ${session.messageCount} msgs | ${session.durationMinutes} min`);
            }
        }

        console.log('\n' + '═'.repeat(60) + '\n');
    }
}

// CLI
if (require.main === module) {
    const targetDate = process.argv[2] || null;
    const tracker = new DailyActivityTracker(targetDate);
    tracker.generateReport();
}

module.exports = DailyActivityTracker;
