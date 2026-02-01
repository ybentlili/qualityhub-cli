import * as fs from 'fs';
import * as xml2js from 'xml2js';
import { BaseParser, QAResultOutput, ProjectInfo } from './base.parser';

export class JaCoCoParser extends BaseParser {
    constructor(projectInfo?: Partial<ProjectInfo>) {
        super(projectInfo);
    }

    async parse(jacocoXmlPath: string): Promise<QAResultOutput> {
        if (!fs.existsSync(jacocoXmlPath)) {
            throw new Error(`JaCoCo XML not found at: ${jacocoXmlPath}`);
        }

        const xmlContent = fs.readFileSync(jacocoXmlPath, 'utf-8');
        const parser = new xml2js.Parser();
        const jacocoData = await parser.parseStringPromise(xmlContent);

        // Extract coverage from JaCoCo XML
        const coverage = this.extractCoverage(jacocoData);

        // Build QA result
        const result: QAResultOutput = {
            ...this.buildBaseResult('jacoco'),
            quality: {
                tests: {
                    total: 0,
                    passed: 0,
                    failed: 0,
                    skipped: 0,
                    duration_ms: 0,
                },
                coverage: {
                    lines: coverage.lines,
                    branches: coverage.branches,
                    functions: coverage.methods,
                    statements: coverage.instructions,
                },
            },
        } as QAResultOutput;

        return result;
    }

    private extractCoverage(jacocoData: any): {
        lines: number;
        branches: number;
        methods: number;
        instructions: number;
    } {
        const report = jacocoData.report;
        const counters = report.counter || [];

        let linesCovered = 0;
        let linesTotal = 0;
        let branchesCovered = 0;
        let branchesTotal = 0;
        let methodsCovered = 0;
        let methodsTotal = 0;
        let instructionsCovered = 0;
        let instructionsTotal = 0;

        counters.forEach((counter: any) => {
            const type = counter.$.type;
            const covered = parseInt(counter.$.covered, 10);
            const missed = parseInt(counter.$.missed, 10);
            const total = covered + missed;

            switch (type) {
                case 'LINE':
                    linesCovered = covered;
                    linesTotal = total;
                    break;
                case 'BRANCH':
                    branchesCovered = covered;
                    branchesTotal = total;
                    break;
                case 'METHOD':
                    methodsCovered = covered;
                    methodsTotal = total;
                    break;
                case 'INSTRUCTION':
                    instructionsCovered = covered;
                    instructionsTotal = total;
                    break;
            }
        });

        return {
            lines: linesTotal > 0 ? (linesCovered / linesTotal) * 100 : 0,
            branches: branchesTotal > 0 ? (branchesCovered / branchesTotal) * 100 : 0,
            methods: methodsTotal > 0 ? (methodsCovered / methodsTotal) * 100 : 0,
            instructions: instructionsTotal > 0 ? (instructionsCovered / instructionsTotal) * 100 : 0,
        };
    }
}