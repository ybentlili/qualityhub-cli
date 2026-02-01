import * as fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import { loadConfig } from '../config/config';
import { APIClient } from '../api/client';

export async function pushCommand(filePath: string): Promise<void> {
    // Check file exists
    if (!fs.existsSync(filePath)) {
        console.error(chalk.red('❌ File not found:'), filePath);
        process.exit(1);
    }

    // Read file
    let data: any;
    try {
        const content = fs.readFileSync(filePath, 'utf-8');
        data = JSON.parse(content);
    } catch (err) {
        console.error(chalk.red('❌ Invalid JSON file'));
        process.exit(1);
    }

    // Load config
    const config = loadConfig();

    // Create API client
    const client = new APIClient(config.api_endpoint);

    // Upload
    const spinner = ora('Uploading QA results...').start();

    try {
        const result = await client.ingestQAResult(data);
        spinner.stop();

        if (!result.success) {
            console.error(chalk.red('❌ Upload failed:'), result.message);
            process.exit(1);
        }

        // Success!
        console.log(chalk.green('✅ QA results uploaded successfully!'));
        console.log('');
        console.log(chalk.cyan('Result ID:'), result.qa_result_id);
        console.log(chalk.cyan('Risk Score:'), getRiskScoreColor(result.risk_score) + '/100');
        console.log(chalk.cyan('Status:'), getRiskStatusColor(result.risk_status));
        console.log(chalk.cyan('Decision:'), getDecisionColor(result.decision));
        console.log('');
        console.log(chalk.gray('View details: http://localhost:3000/dashboard'));
    } catch (err: any) {
        spinner.stop();
        console.error(chalk.red('❌ Failed to upload results'));
        console.error(chalk.gray(err.message));
        process.exit(1);
    }
}

function getRiskScoreColor(score: number): string {
    if (score >= 80) {
        return chalk.green(score.toString());
    } else if (score >= 60) {
        return chalk.yellow(score.toString());
    } else {
        return chalk.red(score.toString());
    }
}

function getRiskStatusColor(status: string): string {
    switch (status) {
        case 'SAFE':
        case 'LOW_RISK':
            return chalk.green(status);
        case 'MEDIUM_RISK':
            return chalk.yellow(status);
        default:
            return chalk.red(status);
    }
}

function getDecisionColor(decision: string): string {
    switch (decision) {
        case 'PROCEED':
            return chalk.green(decision);
        case 'CAUTION_PROCEED':
            return chalk.yellow(decision);
        default:
            return chalk.red(decision);
    }
}