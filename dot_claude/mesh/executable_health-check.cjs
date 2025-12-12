#!/usr/bin/env node

/**
 * CloudRaider Mesh Health Check
 * Verifies connectivity and status of all mesh nodes
 *
 * Usage:
 *   node ~/.claude/mesh/health-check.cjs           # Check all nodes
 *   node ~/.claude/mesh/health-check.cjs quick     # Quick check (no load)
 *   node ~/.claude/mesh/health-check.cjs update    # Update topology.json status
 */

const { exec } = require('child_process');
const util = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = util.promisify(exec);
const TOPOLOGY_FILE = path.join(__dirname, 'topology.json');

class MeshHealthCheck {
    constructor() {
        this.topology = null;
        this.results = {};
    }

    async loadTopology() {
        const data = await fs.readFile(TOPOLOGY_FILE, 'utf8');
        this.topology = JSON.parse(data);
        return this.topology;
    }

    async checkNode(nodeId, node) {
        const startTime = Date.now();
        const result = {
            nodeId,
            name: node.name,
            expectedStatus: node.status,
            actualStatus: 'unknown',
            latencyMs: null,
            load: null,
            gemini: null,
            error: null
        };

        try {
            // Skip K8s nodes (check via kubectl)
            if (node.type === 'kubernetes') {
                result.actualStatus = 'skipped';
                result.note = 'Use kubectl to check K8s nodes';
                return result;
            }

            // Build SSH command
            let sshTarget;
            if (node.sshAlias === 'localhost' || !node.sshAlias) {
                // Local node
                const { stdout } = await execAsync('echo "online"', { timeout: 5000 });
                result.actualStatus = 'active';
                result.latencyMs = Date.now() - startTime;
            } else {
                // Remote node via SSH alias
                sshTarget = node.sshAlias;

                // Quick connectivity test
                const { stdout } = await execAsync(
                    `ssh -o ConnectTimeout=5 -o BatchMode=yes ${sshTarget} 'echo online'`,
                    { timeout: 10000 }
                );

                result.actualStatus = stdout.trim() === 'online' ? 'active' : 'error';
                result.latencyMs = Date.now() - startTime;
            }

            // If online, get additional info
            if (result.actualStatus === 'active' && node.sshAlias && node.sshAlias !== 'localhost') {
                try {
                    // Get load average (works on macOS and Linux)
                    if (node.type === 'windows') {
                        // Windows - skip load for now
                        result.load = 'N/A (Windows)';
                    } else {
                        const { stdout: loadOut } = await execAsync(
                            `ssh -o ConnectTimeout=5 ${sshTarget} "uptime | awk -F 'load average:' '{print \\$2}' | awk '{print \\$1}' | tr -d ','"`,
                            { timeout: 10000 }
                        );
                        result.load = parseFloat(loadOut.trim()) || 'N/A';
                    }

                    // Check Gemini
                    if (node.software?.geminiInstalled) {
                        const geminiPath = node.software.geminiPath || 'gemini';
                        const { stdout: geminiOut } = await execAsync(
                            `ssh -o ConnectTimeout=5 ${sshTarget} "${geminiPath} --version 2>/dev/null || echo 'not found'"`,
                            { timeout: 10000 }
                        );
                        result.gemini = geminiOut.trim().includes('not found') ? 'not installed' : geminiOut.trim();
                    }
                } catch (e) {
                    // Non-fatal - node is still online
                    result.note = `Online but additional checks failed: ${e.message}`;
                }
            }

        } catch (error) {
            result.actualStatus = 'offline';
            result.latencyMs = Date.now() - startTime;
            result.error = error.message.includes('timed out') ? 'Connection timeout' : error.message;
        }

        return result;
    }

    async checkKubernetes() {
        const result = {
            nodeId: 'kubernetes',
            name: 'Vultr K8s Cluster',
            actualStatus: 'unknown',
            nodes: [],
            pods: []
        };

        try {
            // Check nodes
            const { stdout: nodesOut } = await execAsync(
                'kubectl get nodes -o json 2>/dev/null',
                { timeout: 15000 }
            );
            const nodesData = JSON.parse(nodesOut);
            result.nodes = nodesData.items.map(n => ({
                name: n.metadata.name,
                status: n.status.conditions.find(c => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady',
                version: n.status.nodeInfo.kubeletVersion
            }));

            // Check CloudRaider pods
            const { stdout: podsOut } = await execAsync(
                'kubectl get pods -n cloudraider -o json 2>/dev/null',
                { timeout: 15000 }
            );
            const podsData = JSON.parse(podsOut);
            result.pods = podsData.items.map(p => ({
                name: p.metadata.name,
                status: p.status.phase,
                ready: p.status.containerStatuses?.every(c => c.ready) || false
            }));

            result.actualStatus = result.nodes.every(n => n.status === 'Ready') ? 'active' : 'degraded';

        } catch (error) {
            result.actualStatus = 'error';
            result.error = error.message;
        }

        return result;
    }

    async runHealthCheck(quick = false) {
        console.log('\n' + '='.repeat(60));
        console.log('  CloudRaider Mesh Health Check');
        console.log('  ' + new Date().toISOString());
        console.log('='.repeat(60) + '\n');

        await this.loadTopology();
        const results = [];

        // Check SSH nodes
        console.log('Checking SSH nodes...\n');
        for (const [nodeId, node] of Object.entries(this.topology.nodes)) {
            if (node.type === 'kubernetes') continue;

            process.stdout.write(`  ${node.name.padEnd(35)} `);
            const result = await this.checkNode(nodeId, node);
            results.push(result);

            const statusIcon = result.actualStatus === 'active' ? '\x1b[32m✓\x1b[0m' :
                              result.actualStatus === 'offline' ? '\x1b[31m✗\x1b[0m' :
                              '\x1b[33m?\x1b[0m';
            const latency = result.latencyMs ? `${result.latencyMs}ms` : '-';
            console.log(`${statusIcon} ${result.actualStatus.padEnd(10)} ${latency}`);
        }

        // Check Kubernetes
        if (!quick) {
            console.log('\nChecking Kubernetes cluster...\n');
            const k8sResult = await this.checkKubernetes();
            results.push(k8sResult);

            if (k8sResult.actualStatus === 'active') {
                console.log(`  K8s Cluster: \x1b[32m✓\x1b[0m ${k8sResult.nodes.length} nodes ready`);
                console.log(`  CloudRaider Pods: ${k8sResult.pods.filter(p => p.ready).length}/${k8sResult.pods.length} running`);
            } else {
                console.log(`  K8s Cluster: \x1b[31m✗\x1b[0m ${k8sResult.error || 'Error'}`);
            }
        }

        // Summary
        console.log('\n' + '-'.repeat(60));
        const active = results.filter(r => r.actualStatus === 'active').length;
        const offline = results.filter(r => r.actualStatus === 'offline').length;
        const total = results.filter(r => r.actualStatus !== 'skipped').length;

        console.log(`\nSummary: ${active}/${total} nodes online`);

        if (offline > 0) {
            console.log('\nOffline nodes:');
            results.filter(r => r.actualStatus === 'offline').forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        }

        // Calculate available resources
        let cores = 0, ram = 0, gpus = 0;
        for (const [nodeId, node] of Object.entries(this.topology.nodes)) {
            const result = results.find(r => r.nodeId === nodeId);
            if (result?.actualStatus === 'active') {
                cores += node.specs?.cores || 0;
                ram += node.specs?.ramGB || 0;
                if (node.specs?.gpu) gpus++;
            }
        }

        console.log(`\nAvailable Resources: ${cores} cores | ${ram}GB RAM | ${gpus} GPUs`);
        console.log('');

        this.results = results;
        return results;
    }

    async updateTopology() {
        await this.runHealthCheck();

        // Update status in topology
        for (const result of this.results) {
            if (result.nodeId && this.topology.nodes[result.nodeId]) {
                this.topology.nodes[result.nodeId].status = result.actualStatus;
                this.topology.nodes[result.nodeId].lastVerified = new Date().toISOString().split('T')[0];
            }
        }

        // Recalculate totals
        let cores = 0, ram = 0, gpus = 0, activeNodes = 0;
        for (const [nodeId, node] of Object.entries(this.topology.nodes)) {
            if (node.status === 'active') {
                activeNodes++;
                cores += node.specs?.cores || 0;
                ram += node.specs?.ramGB || 0;
                if (node.specs?.gpu) gpus++;
            }
        }

        this.topology.totals.nodesActive = activeNodes;
        this.topology.totals.cpuCores = cores;
        this.topology.totals.ramGB = ram;
        this.topology.totals.gpusActive = gpus;
        this.topology._metadata.lastUpdated = new Date().toISOString().split('T')[0];

        // Save updated topology
        await fs.writeFile(TOPOLOGY_FILE, JSON.stringify(this.topology, null, 2));
        console.log(`\nUpdated ${TOPOLOGY_FILE}`);
    }
}

// CLI
if (require.main === module) {
    const checker = new MeshHealthCheck();
    const command = process.argv[2];

    switch (command) {
        case 'quick':
            checker.runHealthCheck(true).then(() => process.exit(0));
            break;
        case 'update':
            checker.updateTopology().then(() => process.exit(0));
            break;
        default:
            checker.runHealthCheck().then(() => process.exit(0));
    }
}

module.exports = { MeshHealthCheck };
