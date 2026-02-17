import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { QAResultOutput } from '../parsers/base.parser';

// ─── Types ───────────────────────────────────────────────────────────

interface AnalysisIssue {
    severity: 'critical' | 'warning' | 'info';
    icon: string;
    message: string;
    detail?: string;
}

interface AnalysisResult {
    current: QAResultOutput;
    previous: QAResultOutput | null;
    issues: AnalysisIssue[];
    riskScore: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    decision: 'PROCEED' | 'CAUTION' | 'BLOCK';
}

// ─── History Management ──────────────────────────────────────────────

const HISTORY_DIR = '.qualityhub';
const HISTORY_FILE = 'history.json';

interface HistoryEntry {
    timestamp: string;
    project: string;
    branch: string;
    commit: string;
    riskScore: number;
    tests: { total: number; passed: number; failed: number };
    coverage: { lines: number; branches: number; functions: number };
    duration_ms: number;
}

function getHistoryPath(): string {
    return path.join(process.cwd(), HISTORY_DIR, HISTORY_FILE);
}

function loadHistory(): HistoryEntry[] {
    const historyPath = getHistoryPath();
    if (!fs.existsSync(historyPath)) return [];
    try {
        return JSON.parse(fs.readFileSync(historyPath, 'utf-8'));
    } catch {
        return [];
    }
}

function saveToHistory(result: QAResultOutput, riskScore: number): void {
    const dir = path.join(process.cwd(), HISTORY_DIR);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    const history = loadHistory();
    const entry: HistoryEntry = {
        timestamp: result.project.timestamp || new Date().toISOString(),
        project: result.project.name,
        branch: result.project.branch,
        commit: result.project.commit,
        riskScore,
        tests: {
            total: result.quality.tests.total,
            passed: result.quality.tests.passed,
            failed: result.quality.tests.failed,
        },
        coverage: {
            lines: result.quality.coverage.lines,
            branches: result.quality.coverage.branches,
            functions: result.quality.coverage.functions,
        },
        duration_ms: result.quality.tests.duration_ms,
    };

    history.push(entry);

    // Keep last 100 entries
    const trimmed = history.slice(-100);
    fs.writeFileSync(getHistoryPath(), JSON.stringify(trimmed, null, 2));
}

function getPreviousEntry(branch?: string): HistoryEntry | null {
    const history = loadHistory();
    if (history.length === 0) return null;

    if (branch) {
        const branchHistory = history.filter(h => h.branch === branch);
        if (branchHistory.length > 0) return branchHistory[branchHistory.length - 1];
    }

    return history[history.length - 1];
}

// ─── Analysis Engine ─────────────────────────────────────────────────

function analyzeResult(current: QAResultOutput): AnalysisResult {
    const issues: AnalysisIssue[] = [];
    const previous = getPreviousEntry(current.project.branch);

    const { tests } = current.quality;
    const passRate = tests.total > 0 ? (tests.passed / tests.total) * 100 : 0;

    if (tests.failed > 0) {
        issues.push({
            severity: tests.failed > 5 ? 'critical' : 'warning',
            icon: tests.failed > 5 ? '🔴' : '🟡',
            message: `${tests.failed} test${tests.failed > 1 ? 's' : ''} failed (${passRate.toFixed(1)}% pass rate)`,
        });
    }

    if (tests.skipped > 5) {
        issues.push({
            severity: 'warning',
            icon: '⏭️',
            message: `${tests.skipped} tests skipped`,
            detail: 'High skip count may indicate ignored issues',
        });
    }

    if (tests.flaky_tests && tests.flaky_tests.length > 0) {
        issues.push({
            severity: 'warning',
            icon: '🎲',
            message: `${tests.flaky_tests.length} flaky test${tests.flaky_tests.length > 1 ? 's' : ''} detected`,
            detail: tests.flaky_tests.slice(0, 3).join(', '),
        });
    }

    if (tests.duration_ms > 300000) {
        issues.push({
            severity: 'info',
            icon: '🐌',
            message: `Test suite is slow (${formatDuration(tests.duration_ms)})`,
            detail: 'Consider parallelizing or splitting test suites',
        });
    }

    const { coverage } = current.quality;

    if (coverage.lines < 50) {
        issues.push({
            severity: 'critical',
            icon: '🔴',
            message: `Line coverage critically low: ${coverage.lines.toFixed(1)}%`,
            detail: 'Minimum recommended: 80%',
        });
    } else if (coverage.lines < 70) {
        issues.push({
            severity: 'warning',
            icon: '🟡',
            message: `Line coverage below target: ${coverage.lines.toFixed(1)}%`,
            detail: 'Recommended: 80%+',
        });
    }

    if (coverage.branches > 0 && coverage.branches < 60) {
        issues.push({
            severity: 'warning',
            icon: '🔀',
            message: `Branch coverage low: ${coverage.branches.toFixed(1)}%`,
            detail: 'Many code paths are untested',
        });
    }

    if (previous) {
        const lineDiff = coverage.lines - previous.coverage.lines;
        if (lineDiff < -3) {
            issues.push({
                severity: 'critical',
                icon: '📉',
                message: `Coverage dropped ${Math.abs(lineDiff).toFixed(1)}% since last run`,
                detail: `${previous.coverage.lines.toFixed(1)}% → ${coverage.lines.toFixed(1)}%`,
            });
        } else if (lineDiff < -1) {
            issues.push({
                severity: 'warning',
                icon: '📉',
                message: `Coverage decreased ${Math.abs(lineDiff).toFixed(1)}%`,
                detail: `${previous.coverage.lines.toFixed(1)}% → ${coverage.lines.toFixed(1)}%`,
            });
        }

        const testDiff = tests.total - previous.tests.total;
        if (testDiff < -5) {
            issues.push({
                severity: 'warning',
                icon: '⚠️',
                message: `${Math.abs(testDiff)} tests removed since last run`,
                detail: `${previous.tests.total} → ${tests.total}`,
            });
        }

        if (previous.duration_ms > 0 && tests.duration_ms > 0) {
            const durationIncrease = ((tests.duration_ms - previous.duration_ms) / previous.duration_ms) * 100;
            if (durationIncrease > 20) {
                issues.push({
                    severity: 'warning',
                    icon: '⏱️',
                    message: `Build time increased ${durationIncrease.toFixed(0)}%`,
                    detail: `${formatDuration(previous.duration_ms)} → ${formatDuration(tests.duration_ms)}`,
                });
            }
        }

        if (tests.failed > previous.tests.failed) {
            const newFailures = tests.failed - previous.tests.failed;
            issues.push({
                severity: 'critical',
                icon: '🆕',
                message: `${newFailures} new test failure${newFailures > 1 ? 's' : ''} since last run`,
            });
        }
    }

    if (current.quality.code_quality) {
        const cq = current.quality.code_quality;
        if (cq.vulnerabilities && cq.vulnerabilities > 0) {
            issues.push({
                severity: 'critical',
                icon: '🛡️',
                message: `${cq.vulnerabilities} security vulnerabilit${cq.vulnerabilities > 1 ? 'ies' : 'y'} found`,
            });
        }
        if (cq.bugs && cq.bugs > 5) {
            issues.push({
                severity: 'warning',
                icon: '🐛',
                message: `${cq.bugs} bugs detected by static analysis`,
            });
        }
        if (cq.sonar_gate === 'FAILED') {
            issues.push({
                severity: 'critical',
                icon: '🚫',
                message: 'SonarQube quality gate FAILED',
            });
        }
    }

    const riskScore = calculateRiskScore(current, previous, issues);
    const riskLevel = getRiskLevel(riskScore);
    const decision = getDecision(riskScore, issues);

    return { current, previous: null, issues, riskScore, riskLevel, decision };
}

function calculateRiskScore(
    current: QAResultOutput,
    previous: HistoryEntry | null,
    issues: AnalysisIssue[]
): number {
    let score = 100;
    const { tests, coverage } = current.quality;

    if (tests.total > 0) {
        const passRate = (tests.passed / tests.total) * 100;
        if (passRate < 100) {
            score -= Math.min(40, (100 - passRate) * 4);
        }
    }

    if (coverage.lines < 80) {
        score -= Math.min(20, (80 - coverage.lines) * 0.5);
    }
    if (coverage.branches > 0 && coverage.branches < 70) {
        score -= Math.min(10, (70 - coverage.branches) * 0.3);
    }

    if (previous) {
        const lineDiff = coverage.lines - previous.coverage.lines;
        if (lineDiff < 0) {
            score -= Math.min(15, Math.abs(lineDiff) * 2);
        }
    }

    const criticals = issues.filter(i => i.severity === 'critical').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    score -= Math.min(15, criticals * 5 + warnings * 2);

    return Math.max(0, Math.min(100, Math.round(score)));
}

function getRiskLevel(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 85) return 'LOW';
    if (score >= 65) return 'MEDIUM';
    if (score >= 40) return 'HIGH';
    return 'CRITICAL';
}

function getDecision(score: number, issues: AnalysisIssue[]): 'PROCEED' | 'CAUTION' | 'BLOCK' {
    const hasCritical = issues.some(i => i.severity === 'critical');
    if (score < 40 || (hasCritical && score < 60)) return 'BLOCK';
    if (score < 75 || hasCritical) return 'CAUTION';
    return 'PROCEED';
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

function deltaString(current: number, previous: number, higherIsBetter: boolean = true): string {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return '';
    const sign = diff > 0 ? '+' : '';
    const arrow = (higherIsBetter ? diff > 0 : diff < 0) ? '▲' : '▼';
    return `${arrow} ${sign}${diff.toFixed(1)}%`;
}

// ─── Terminal Display ────────────────────────────────────────────────

function renderProgressBar(value: number, width: number = 20): string {
    const filled = Math.round((value / 100) * width);
    const empty = width - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    let color: typeof chalk.green;
    if (value >= 80) color = chalk.green;
    else if (value >= 60) color = chalk.yellow;
    else color = chalk.red;

    return color(bar);
}

function renderRiskGauge(score: number): string {
    const level = getRiskLevel(score);
    const colors: Record<string, typeof chalk.green> = {
        LOW: chalk.green,
        MEDIUM: chalk.yellow,
        HIGH: chalk.red,
        CRITICAL: chalk.bgRed.white,
    };
    const icons: Record<string, string> = {
        LOW: '✅',
        MEDIUM: '⚠️',
        HIGH: '🔶',
        CRITICAL: '🔴',
    };
    const color = colors[level];
    return `${icons[level]} ${color(`${score}/100`)} ${color(`(${level} RISK)`)}`;
}

function renderDecision(decision: string): string {
    switch (decision) {
        case 'PROCEED':
            return chalk.green.bold('✅ PROCEED — Safe to deploy');
        case 'CAUTION':
            return chalk.yellow.bold('⚠️  CAUTION — Review issues before deploying');
        case 'BLOCK':
            return chalk.red.bold('🛑 BLOCK — Do not deploy, fix critical issues first');
        default:
            return decision;
    }
}

function renderDelta(current: number, previous: number, higherIsBetter: boolean = true): string {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return chalk.gray(' (no change)');

    const sign = diff > 0 ? '+' : '';
    const isGood = higherIsBetter ? diff > 0 : diff < 0;
    const color = isGood ? chalk.green : chalk.red;
    const arrow = isGood ? '▲' : '▼';

    return color(` ${arrow} ${sign}${diff.toFixed(1)}%`);
}

function displayAnalysis(analysis: AnalysisResult): void {
    const { current, issues, riskScore, decision } = analysis;
    const { tests, coverage } = current.quality;
    const previous = getPreviousEntry(current.project.branch);
    const passRate = tests.total > 0 ? (tests.passed / tests.total) * 100 : 0;

    console.log('');
    console.log(chalk.bold('🔍 QualityHub Analysis'));
    console.log(chalk.gray('━'.repeat(50)));

    console.log('');
    console.log(chalk.gray(`   Project:  ${current.project.name}@${current.project.version}`));
    console.log(chalk.gray(`   Branch:   ${current.project.branch}`));
    console.log(chalk.gray(`   Commit:   ${current.project.commit.substring(0, 7)}`));
    if (previous) {
        console.log(chalk.gray(`   Compared: last run on ${current.project.branch}`));
    } else {
        console.log(chalk.gray(`   Compared: first run (no history)`));
    }

    console.log('');
    console.log(chalk.bold('   📊 Tests'));
    if (tests.total === 0) {
        console.log(chalk.gray('      ℹ️  No test results found'));
        console.log(chalk.gray(`         Tip: ensure your test runner exports results`));
    } else {
        const testStatusIcon = tests.failed === 0 ? chalk.green('✅') : chalk.red('❌');
        console.log(`      ${testStatusIcon} ${tests.passed}/${tests.total} passed (${passRate.toFixed(1)}%)`);

        if (tests.failed > 0) {
            console.log(chalk.red(`      ❌ ${tests.failed} failed`));
        }
        if (tests.skipped > 0) {
            console.log(chalk.gray(`      ⏭️  ${tests.skipped} skipped`));
        }
    }
    if (tests.duration_ms > 0) {
        let durationLine = `      ⏱️  Duration: ${formatDuration(tests.duration_ms)}`;
        if (previous && previous.duration_ms > 0) {
            const durationDelta = ((tests.duration_ms - previous.duration_ms) / previous.duration_ms) * 100;
            durationLine += renderDelta(0, durationDelta, false);
        }
        console.log(durationLine);
    }

    console.log('');
    console.log(chalk.bold('   📈 Coverage'));
    console.log(`      Lines:      ${renderProgressBar(coverage.lines)} ${coverage.lines.toFixed(1)}%${previous ? renderDelta(coverage.lines, previous.coverage.lines) : ''}`);
    console.log(`      Branches:   ${renderProgressBar(coverage.branches)} ${coverage.branches.toFixed(1)}%${previous ? renderDelta(coverage.branches, previous.coverage.branches) : ''}`);
    console.log(`      Functions:  ${renderProgressBar(coverage.functions)} ${coverage.functions.toFixed(1)}%${previous ? renderDelta(coverage.functions, previous.coverage.functions) : ''}`);

    if (issues.length > 0) {
        console.log('');
        console.log(chalk.bold('   🚨 Issues Detected'));
        issues.forEach(issue => {
            console.log(`      ${issue.icon} ${issue.message}`);
            if (issue.detail) {
                console.log(chalk.gray(`         ${issue.detail}`));
            }
        });
    } else {
        console.log('');
        console.log(chalk.green('   ✨ No issues detected'));
    }

    console.log('');
    console.log(chalk.gray('━'.repeat(50)));
    console.log(`   🎯 Risk Score:  ${renderRiskGauge(riskScore)}`);
    console.log(`   📋 Decision:    ${renderDecision(decision)}`);
    console.log(chalk.gray('━'.repeat(50)));

    const history = loadHistory();
    if (history.length > 0) {
        console.log(chalk.gray(`\n   📁 History: ${history.length} previous run${history.length > 1 ? 's' : ''} stored in .qualityhub/`));
    }

    console.log('');
}

// ─── Markdown Renderer (for MR/PR comments) ─────────────────────────

function generateMarkdown(analysis: AnalysisResult): string {
    const { current, issues, riskScore, riskLevel, decision } = analysis;
    const { tests, coverage } = current.quality;
    const previous = getPreviousEntry(current.project.branch);
    const passRate = tests.total > 0 ? (tests.passed / tests.total) * 100 : 0;

    const lines: string[] = [];

    // Header
    const decisionEmoji: Record<string, string> = {
        PROCEED: '✅', CAUTION: '⚠️', BLOCK: '🛑',
    };
    const decisionText: Record<string, string> = {
        PROCEED: 'Safe to deploy',
        CAUTION: 'Review issues before deploying',
        BLOCK: 'Do not deploy — fix critical issues first',
    };

    lines.push(`## ${decisionEmoji[decision]} QualityHub — Risk Score: ${riskScore}/100 (${riskLevel})`);
    lines.push('');
    lines.push(`**${decisionText[decision]}**`);
    lines.push('');

    // Summary table
    lines.push('| Metric | Value | Delta |');
    lines.push('|--------|-------|-------|');

    if (tests.total > 0) {
        const testIcon = tests.failed === 0 ? '✅' : '❌';
        const failDelta = previous
            ? (tests.failed !== previous.tests.failed ? deltaString(tests.failed, previous.tests.failed, false) : '—')
            : '—';
        lines.push(`| ${testIcon} Tests | ${tests.passed}/${tests.total} passed (${passRate.toFixed(1)}%) | ${failDelta} |`);

        if (tests.failed > 0) {
            lines.push(`| ❌ Failed | ${tests.failed} | |`);
        }
        if (tests.skipped > 0) {
            lines.push(`| ⏭️ Skipped | ${tests.skipped} | |`);
        }
    }

    const ld = previous ? (deltaString(coverage.lines, previous.coverage.lines) || '—') : '—';
    const bd = previous ? (deltaString(coverage.branches, previous.coverage.branches) || '—') : '—';
    const fd = previous ? (deltaString(coverage.functions, previous.coverage.functions) || '—') : '—';
    lines.push(`| 📈 Line Coverage | ${coverage.lines.toFixed(1)}% | ${ld} |`);
    lines.push(`| 🔀 Branch Coverage | ${coverage.branches.toFixed(1)}% | ${bd} |`);
    lines.push(`| ⚙️ Function Coverage | ${coverage.functions.toFixed(1)}% | ${fd} |`);

    if (tests.duration_ms > 0) {
        let dd = '—';
        if (previous && previous.duration_ms > 0) {
            const pct = ((tests.duration_ms - previous.duration_ms) / previous.duration_ms) * 100;
            if (Math.abs(pct) >= 1) {
                dd = `${pct > 0 ? '+' : ''}${pct.toFixed(0)}%`;
            }
        }
        lines.push(`| ⏱️ Duration | ${formatDuration(tests.duration_ms)} | ${dd} |`);
    }

    // Issues
    if (issues.length > 0) {
        lines.push('');
        lines.push('<details>');
        lines.push(`<summary>🚨 ${issues.length} issue${issues.length > 1 ? 's' : ''} detected</summary>`);
        lines.push('');
        for (const issue of issues) {
            const badge = issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
            lines.push(`- ${badge} **${issue.message}**`);
            if (issue.detail) {
                lines.push(`  - _${issue.detail}_`);
            }
        }
        lines.push('');
        lines.push('</details>');
    }

    // Footer
    lines.push('');
    lines.push('---');
    lines.push(`<sub>Generated by <a href="https://github.com/ybentlili/qualityhub-cli">QualityHub CLI</a> · ${current.project.branch}@${current.project.commit.substring(0, 7)}</sub>`);

    return lines.join('\n');
}

// ─── Command ─────────────────────────────────────────────────────────

export async function analyzeCommand(
    inputFile: string,
    options: { save?: boolean; format?: string; output?: string }
): Promise<void> {
    if (!fs.existsSync(inputFile)) {
        console.error(chalk.red(`\n❌ File not found: ${inputFile}`));
        console.error(chalk.gray(`\n   Run ${chalk.cyan('qualityhub parse <format> <path>')} first to generate a qa-result.json`));
        process.exit(1);
    }

    let qaResult: QAResultOutput;
    try {
        qaResult = JSON.parse(fs.readFileSync(inputFile, 'utf-8'));
    } catch (err) {
        console.error(chalk.red(`\n❌ Invalid JSON in: ${inputFile}`));
        process.exit(1);
    }

    if (!qaResult.quality || !qaResult.quality.tests || !qaResult.quality.coverage) {
        console.error(chalk.red('\n❌ Invalid qa-result.json: missing quality.tests or quality.coverage'));
        process.exit(1);
    }

    const analysis = analyzeResult(qaResult);

    if (options.format === 'markdown') {
        const markdown = generateMarkdown(analysis);

        if (options.output) {
            fs.writeFileSync(options.output, markdown);
            console.log(chalk.green(`\n✅ Markdown report saved to ${options.output}`));
        } else {
            console.log(markdown);
        }
    } else {
        displayAnalysis(analysis);
    }

    if (options.save !== false) {
        saveToHistory(qaResult, analysis.riskScore);
    }

    if (analysis.decision === 'BLOCK') {
        process.exit(1);
    }
}