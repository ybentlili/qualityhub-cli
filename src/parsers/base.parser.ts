export interface QAResultOutput {
    version: string;
    project: {
        name: string;
        version: string;
        commit: string;
        branch: string;
        timestamp: string;
    };
    quality: {
        tests: {
            total: number;
            passed: number;
            failed: number;
            skipped: number;
            duration_ms: number;
            flaky_tests?: string[];
        };
        coverage: {
            lines: number;
            branches: number;
            functions: number;
            statements?: number;
            diff_coverage?: number;
        };
        code_quality?: {
            sonar_gate?: string;
            bugs: number;
            vulnerabilities: number;
            code_smells: number;
            security_hotspots?: number;
            tech_debt_minutes?: number;
        };
    };
    metadata?: {
        ci_provider?: string;
        ci_url?: string;
        adapters: string[];
    };
}

export interface ProjectInfo {
    name: string;
    version: string;
    commit: string;
    branch: string;
}

export abstract class BaseParser {
    protected projectInfo: ProjectInfo;

    constructor(projectInfo?: Partial<ProjectInfo>) {
        this.projectInfo = {
            name: projectInfo?.name || process.env.npm_package_name || 'unknown',
            version: projectInfo?.version || process.env.npm_package_version || '0.0.0',
            commit: projectInfo?.commit || process.env.GIT_COMMIT || process.env.GITHUB_SHA || 'unknown',
            branch: projectInfo?.branch || process.env.GIT_BRANCH || process.env.GITHUB_REF_NAME || 'main',
        };
    }

    abstract parse(filePath: string): Promise<QAResultOutput>;

    protected detectCIProvider(): string | undefined {
        if (process.env.GITHUB_ACTIONS) return 'github-actions';
        if (process.env.GITLAB_CI) return 'gitlab-ci';
        if (process.env.CIRCLECI) return 'circleci';
        if (process.env.JENKINS_URL) return 'jenkins';
        if (process.env.TRAVIS) return 'travis-ci';
        return undefined;
    }

    protected getCIUrl(): string | undefined {
        if (process.env.GITHUB_ACTIONS) {
            const { GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
            return `https://github.com/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
        }
        if (process.env.GITLAB_CI) {
            return process.env.CI_PIPELINE_URL;
        }
        if (process.env.CIRCLECI) {
            return process.env.CIRCLE_BUILD_URL;
        }
        return undefined;
    }

    protected buildBaseResult(adapterName: string): Partial<QAResultOutput> {
        return {
            version: '1.0.0',
            project: {
                name: this.projectInfo.name,
                version: this.projectInfo.version,
                commit: this.projectInfo.commit,
                branch: this.projectInfo.branch,
                timestamp: new Date().toISOString(),
            },
            metadata: {
                ci_provider: this.detectCIProvider(),
                ci_url: this.getCIUrl(),
                adapters: [adapterName],
            },
        };
    }
}