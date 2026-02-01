#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init';
import { pushCommand } from './commands/push';
import { parseCommand } from './commands/parse';

const program = new Command();

program
    .name('qualityhub')
    .description('QualityHub CLI - AI-powered quality intelligence')
    .version('1.0.0');

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
    .command('push <file>')
    .description('Push QA results to QualityHub')
    .action(async (file: string) => {
        await pushCommand(file);
    });

program.parse();