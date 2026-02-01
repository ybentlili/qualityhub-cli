import chalk from 'chalk';
import { saveConfig, configExists } from '../config/config';

export async function initCommand(): Promise<void> {
    console.log(chalk.blue('🔧 Initializing QualityHub...'));

    if (configExists()) {
        console.log(chalk.yellow('⚠️  .qualityhub.yaml already exists'));
        console.log('Use ' + chalk.cyan('qualityhub push') + ' to send results to QualityHub');
        return;
    }

    const config = {
        api_endpoint: 'http://localhost:8080',
        project_name: '',
    };

    saveConfig(config);

    console.log(chalk.green('✅ QualityHub initialized!'));
    console.log('');
    console.log('Created ' + chalk.cyan('.qualityhub.yaml'));
    console.log('');
    console.log('Next steps:');
    console.log('  1. Edit ' + chalk.cyan('.qualityhub.yaml') + ' to configure your project');
    console.log('  2. Run ' + chalk.cyan('qualityhub push <qa-result.json>') + ' to send your first result');
}