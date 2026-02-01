import * as fs from 'fs';
import * as path from 'path';
import { BaseParser, QAResultOutput, ProjectInfo } from './base.parser';

interface JestCoverageSummary {
    total: {
        lines: { pct: number };
        statements: { pct: number };
        functions: { pct: number };
        branches: { pct: number };
    };
}

export class JestParser extends BaseParser {
    constructor(projectInfo?: Partial<ProjectInfo>) {
        super(projectInfo);
    }

    async parse(coverageDir: string): Promise<QAResultOutput> {
        const coverageSummaryPath = path.join(coverageDir, 'coverage-summary.json');

        if (!fs.existsSync(coverageSummaryPath)) {
            throw new Error(`Coverage summary not found at: ${coverageSummaryPath}`);
        }

        // Read coverage summary
        const coverageData: JestCoverageSummary = JSON.parse(
            fs.readFileSync(coverageSummaryPath, 'utf-8')
        );

        // Try to read test results if available
        let testResults = this.parseTestResults(coverageDir);

        // Build QA result
        const result: QAResultOutput = {
            ...this.buildBaseResult('jest'),
            quality: {
                tests: {
                    total: testResults.total,
                    passed: testResults.passed,
                    failed: testResults.failed,
                    skipped: testResults.skipped,
                    duration_ms: testResults.duration_ms,
                    flaky_tests: testResults.flaky_tests,
                },
                coverage: {
                    lines: coverageData.total.lines.pct,
                    branches: coverageData.total.branches.pct,
                    functions: coverageData.total.functions.pct,
                    statements: coverageData.total.statements.pct,
                },
            },
        } as QAResultOutput;

        return result;
    }

    private parseTestResults(coverageDir: string): {
        total: number;
        passed: number;
        failed: number;
        skipped: number;
        duration_ms: number;
        flaky_tests?: string[];
    } {
        // Try to find jest test results
        const testResultsPath = path.join(path.dirname(coverageDir), 'test-results.json');

        if (fs.existsSync(testResultsPath)) {
            const testData = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'));
            return {
                total: testData.numTotalTests || 0,
                passed: testData.numPassedTests || 0,
                failed: testData.numFailedTests || 0,
                skipped: testData.numPendingTests || 0,
                duration_ms: testData.testResults?.reduce((acc: number, r: any) => acc + (r.perfStats?.runtime || 0), 0) || 0,
            };
        }

        // Default values if no test results found
        return {
            total: 0,
            passed: 0,
            failed: 0,
            skipped: 0,
            duration_ms: 0,
        };
    }
}