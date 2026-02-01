import * as fs from 'fs';
import * as path from 'path';
import * as xml2js from 'xml2js';
import { BaseParser, QAResultOutput, ProjectInfo } from './base.parser';

export class JUnitParser extends BaseParser {
    constructor(projectInfo?: Partial<ProjectInfo>) {
        super(projectInfo);
    }

    async parse(testResultsDir: string): Promise<QAResultOutput> {
        // Find all TEST-*.xml files
        const xmlFiles = fs.readdirSync(testResultsDir).filter(f => f.startsWith('TEST-') && f.endsWith('.xml'));

        if (xmlFiles.length === 0) {
            throw new Error(`No JUnit XML files found in: ${testResultsDir}`);
        }

        let totalTests = 0;
        let passedTests = 0;
        let failedTests = 0;
        let skippedTests = 0;
        let totalDuration = 0;
        const flakyTests: string[] = [];

        const parser = new xml2js.Parser();

        // Parse all XML files
        for (const xmlFile of xmlFiles) {
            const xmlPath = path.join(testResultsDir, xmlFile);
            const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
            const testData = await parser.parseStringPromise(xmlContent);

            // Extract test suite data
            const testsuites = testData.testsuites || testData;
            const suites = Array.isArray(testsuites.testsuite) ? testsuites.testsuite : [testsuites.testsuite];

            suites.forEach((suite: any) => {
                if (!suite || !suite.$) return;

                const tests = parseInt(suite.$.tests || '0', 10);
                const failures = parseInt(suite.$.failures || '0', 10);
                const errors = parseInt(suite.$.errors || '0', 10);
                const skipped = parseInt(suite.$.skipped || '0', 10);
                const time = parseFloat(suite.$.time || '0');

                totalTests += tests;
                failedTests += failures + errors;
                skippedTests += skipped;
                passedTests += tests - failures - errors - skipped;
                totalDuration += time * 1000; // Convert to ms

                // Check for flaky tests (if testcase has multiple runs)
                if (suite.testcase) {
                    const testcases = Array.isArray(suite.testcase) ? suite.testcase : [suite.testcase];
                    testcases.forEach((testcase: any) => {
                        if (testcase.flakyFailure || testcase['flaky-failure']) {
                            flakyTests.push(`${suite.$.name}.${testcase.$.name}`);
                        }
                    });
                }
            });
        }

        // Build QA result
        const result: QAResultOutput = {
            ...this.buildBaseResult('junit'),
            quality: {
                tests: {
                    total: totalTests,
                    passed: passedTests,
                    failed: failedTests,
                    skipped: skippedTests,
                    duration_ms: Math.round(totalDuration),
                    ...(flakyTests.length > 0 && { flaky_tests: flakyTests }),
                },
                coverage: {
                    lines: 0,
                    branches: 0,
                    functions: 0,
                },
            },
        } as QAResultOutput;

        return result;
    }
}