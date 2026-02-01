import * as fs from 'fs';
import chalk from 'chalk';
import { JestParser } from '../parsers/jest.parser';
import { JaCoCoParser } from '../parsers/jacoco.parser';
import { JUnitParser } from '../parsers/junit.parser';
import type { QAResultOutput } from '../parsers/base.parser';

export async function parseCommand(
    format: 'jest' | 'jacoco' | 'junit',
    inputPath: string,
    options: { output?: string; project?: string; version?: string; commit?: string; branch?: string }
): Promise<void> {
    console.log(chalk.blue(`🔍 Parsing ${format} results from: ${inputPath}`));

    let result: QAResultOutput;

    try {
        const projectInfo = {
            name: options.project,
            version: options.version,
            commit: options.commit,
            branch: options.branch,
        };

        switch (format) {
            case 'jest':
                const jestParser = new JestParser(projectInfo);
                result = await jestParser.parse(inputPath);
                break;

            case 'jacoco':
                const jacocoParser = new JaCoCoParser(projectInfo);
                result = await jacocoParser.parse(inputPath);
                break;

            case 'junit':
                const junitParser = new JUnitParser(projectInfo);
                result = await junitParser.parse(inputPath);
                break;

            default:
                throw new Error(`Unknown format: ${format}`);
        }

        // Write to output file
        const outputPath = options.output || 'qa-result.json';
        fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

        console.log(chalk.green('✅ QA result generated successfully!'));
        console.log('');
        console.log(chalk.cyan('Output:'), outputPath);
        console.log(chalk.cyan('Project:'), result.project.name);
        console.log(chalk.cyan('Tests:'), `${result.quality.tests.passed}/${result.quality.tests.total} passed`);
        console.log(chalk.cyan('Coverage:'), `${result.quality.coverage.lines.toFixed(1)}% lines`);
        console.log('');
        console.log(chalk.gray('Next step:'), 'qualityhub push', outputPath);
    } catch (err: any) {
        console.error(chalk.red('❌ Failed to parse results'));
        console.error(chalk.gray(err.message));
        process.exit(1);
    }
}