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
    .version('1.2.0');

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
    .option('-p, --project <n>', 'Project name')
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
    .option('-f, --format <type>', 'Output format: terminal (default) or markdown')
    .option('-o, --output <file>', 'Save report to file (use with --format markdown)')
    .option('--comment', 'Post analysis as comment on GitLab MR / GitHub PR')
    .option('--provider <type>', 'Git provider: gitlab (default) or github', 'gitlab')
    .option('--token <token>', 'API token (or set GITLAB_TOKEN / GITHUB_TOKEN env var)')
    .option('--project-id <id>', 'GitLab project ID or GitHub owner/repo')
    .option('--mr-id <id>', 'Merge request / Pull request number')
    .option('--api-url <url>', 'Custom API URL (for self-hosted GitLab)')
    .action(async (file: string = 'qa-result.json', options: any) => {
        await analyzeCommand(file, {
            save: options.save,
            format: options.format,
            output: options.output,
            comment: options.comment,
            provider: options.provider,
            token: options.token,
            projectId: options.projectId,
            mrId: options.mrId,
            apiUrl: options.apiUrl,
        });
    });

program
    .command('push <file>')
    .description('Push QA results to QualityHub')
    .action(async (file: string) => {
        await pushCommand(file);
    });

program.parse();