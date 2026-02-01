import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';

export interface QualityHubConfig {
    api_endpoint: string;
    project_name?: string;
    api_key?: string;
}

const CONFIG_FILE = '.qualityhub.yaml';

export function loadConfig(): QualityHubConfig {
    const configPath = path.join(process.cwd(), CONFIG_FILE);

    if (!fs.existsSync(configPath)) {
        return {
            api_endpoint: 'http://localhost:8080',
        };
    }

    const content = fs.readFileSync(configPath, 'utf-8');
    return yaml.load(content) as QualityHubConfig;
}

export function saveConfig(config: QualityHubConfig): void {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    const yamlStr = yaml.dump(config);
    fs.writeFileSync(configPath, yamlStr, 'utf-8');
}

export function configExists(): boolean {
    const configPath = path.join(process.cwd(), CONFIG_FILE);
    return fs.existsSync(configPath);
}