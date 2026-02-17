#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { pushCommand } from './commands/push';
import { parseCommand } from './commands/parse';
import { analyzeCommand } from './commands/analyze';

const program = new Command();

program
    .name('qualityhub')
    .description('QualityHub CLI - AI-powered quality intelligence')
    .version('1.1.0');

program
    .command('init')
    .description('Initialize QualityHub in the current directory')
    .action(async () => {
        await initCommand();
    });

program
    .command('parse <format> <path>')
    .description('Parse test results and generate qa-result.json')
    .option('-o, --output <file>', 'Output file path', 'qa-result.json')
    .option('-p, --project <name>', 'Project name')
    .option('-v, --version <version>', 'Project version')
    .option('-c, --commit <commit>', 'Git commit hash')
    .option('-b, --branch <branch>', 'Git branch name')
    .action(async (format: 'jest' | 'jacoco' | 'junit', path: string, options: any) => {
        await parseCommand(format, path, options);
    });

program
    .command('analyze [file]')
    .description('Analyze qa-result.json and show risk assessment')
    .option('--no-save', 'Do not save to local history')
    .option('-f, --format <type>', 'Output format: terminal (default) or markdown', 'terminal')
    .option('-o, --output <file>', 'Save report to file (use with --format markdown)')
    .action(async (file: string = 'qa-result.json', options: any) => {
        await analyzeCommand(file, {
            save: options.save,
            format: options.format,
            output: options.output,
        });
    });

program
    .command('push <file>')
    .description('Push QA results to QualityHub')
    .action(async (file: string) => {
        await pushCommand(file);
    });

program.parse();