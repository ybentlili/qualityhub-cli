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
        // Search for test-results.json in multiple locations
        const searchPaths = [
            path.join(coverageDir, 'test-results.json'),           // inside coverage dir
            path.join(path.dirname(coverageDir), 'test-results.json'), // parent dir
            path.join(process.cwd(), 'test-results.json'),         // project root
        ];

        const testResultsPath = searchPaths.find(p => fs.existsSync(p));

        if (testResultsPath) {
            const testData = JSON.parse(fs.readFileSync(testResultsPath, 'utf-8'));

            // Calculate duration from testResults array
            let duration_ms = 0;
            if (testData.testResults && Array.isArray(testData.testResults)) {
                duration_ms = testData.testResults.reduce((acc: number, r: any) => {
                    // Support both perfStats.runtime and startTime/endTime
                    if (r.perfStats?.runtime) return acc + r.perfStats.runtime;
                    if (r.endTime && r.startTime) return acc + (r.endTime - r.startTime);
                    return acc;
                }, 0);
            }

            // Detect slow tests (>5s) as potential flaky candidates
            const flaky_tests: string[] = [];
            if (testData.testResults && Array.isArray(testData.testResults)) {
                for (const suite of testData.testResults) {
                    if (suite.assertionResults && Array.isArray(suite.assertionResults)) {
                        for (const test of suite.assertionResults) {
                            if (test.duration && test.duration > 5000) {
                                const name = [...(test.ancestorTitles || []), test.title].join(' > ');
                                flaky_tests.push(name);
                            }
                        }
                    }
                }
            }

            return {
                total: testData.numTotalTests || 0,
                passed: testData.numPassedTests || 0,
                failed: testData.numFailedTests || 0,
                skipped: testData.numPendingTests || 0,
                duration_ms,
                flaky_tests: flaky_tests.length > 0 ? flaky_tests : undefined,
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