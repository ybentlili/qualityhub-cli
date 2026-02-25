import axios from 'axios';
import chalk from 'chalk';

// ─── Types ───────────────────────────────────────────────────────────

interface GitProvider {
    name: 'gitlab' | 'github';
    token: string;
    apiUrl: string;
    projectId: string;
    mergeRequestId: string;
}

// ─── Auto-detect CI environment ──────────────────────────────────────

export function detectProvider(): GitProvider | null {
    // GitLab CI
    if (process.env.GITLAB_CI) {
        const token = process.env.QUALITYHUB_TOKEN
            || process.env.GITLAB_TOKEN
            || process.env.CI_JOB_TOKEN;
        const projectId = process.env.CI_PROJECT_ID;
        const mergeRequestId = process.env.CI_MERGE_REQUEST_IID;
        const apiUrl = process.env.CI_API_V4_URL || 'https://gitlab.com/api/v4';

        if (token && projectId && mergeRequestId) {
            return { name: 'gitlab', token, apiUrl, projectId, mergeRequestId };
        }
        return null;
    }

    // GitHub Actions
    if (process.env.GITHUB_ACTIONS) {
        const token = process.env.QUALITYHUB_TOKEN || process.env.GITHUB_TOKEN;
        const repo = process.env.GITHUB_REPOSITORY;
        const eventPath = process.env.GITHUB_EVENT_PATH;

        if (token && repo && eventPath) {
            try {
                const fs = require('fs');
                const event = JSON.parse(fs.readFileSync(eventPath, 'utf-8'));
                const prNumber = event.pull_request?.number || event.number;
                if (prNumber) {
                    return {
                        name: 'github',
                        token,
                        apiUrl: 'https://api.github.com',
                        projectId: repo,
                        mergeRequestId: String(prNumber),
                    };
                }
            } catch {}
        }
        return null;
    }

    return null;
}

// ─── Manual config from CLI flags ────────────────────────────────────

export function manualProvider(options: {
    provider: string;
    token: string;
    projectId: string;
    mrId: string;
    apiUrl?: string;
}): GitProvider {
    return {
        name: options.provider as 'gitlab' | 'github',
        token: options.token,
        apiUrl: options.apiUrl || (options.provider === 'gitlab' ? 'https://gitlab.com/api/v4' : 'https://api.github.com'),
        projectId: options.projectId,
        mergeRequestId: options.mrId,
    };
}

// ─── Post comment ────────────────────────────────────────────────────

const COMMENT_SIGNATURE = '<!-- qualityhub-analysis -->';

export async function postComment(provider: GitProvider, markdown: string): Promise<void> {
    const body = `${COMMENT_SIGNATURE}\n${markdown}`;

    if (provider.name === 'gitlab') {
        await postGitLabComment(provider, body);
    } else {
        await postGitHubComment(provider, body);
    }
}

// ─── GitLab ──────────────────────────────────────────────────────────

async function postGitLabComment(provider: GitProvider, body: string): Promise<void> {
    const baseUrl = `${provider.apiUrl}/projects/${provider.projectId}/merge_requests/${provider.mergeRequestId}/notes`;
    const headers = { 'PRIVATE-TOKEN': provider.token };

    // Find and delete previous QualityHub comment (keep MR clean)
    try {
        const { data: notes } = await axios.get(baseUrl, { headers });
        for (const note of notes) {
            if (note.body && note.body.includes(COMMENT_SIGNATURE)) {
                await axios.delete(`${baseUrl}/${note.id}`, { headers });
            }
        }
    } catch {
        // Ignore errors when cleaning old comments
    }

    // Post new comment
    const { data } = await axios.post(baseUrl, { body }, { headers });

    console.log(chalk.green('\n✅ Comment posted on GitLab MR'));
    console.log(chalk.gray(`   MR !${provider.mergeRequestId} · Note #${data.id}`));
}

// ─── GitHub ──────────────────────────────────────────────────────────

async function postGitHubComment(provider: GitProvider, body: string): Promise<void> {
    const baseUrl = `${provider.apiUrl}/repos/${provider.projectId}/issues/${provider.mergeRequestId}/comments`;
    const headers = {
        Authorization: `Bearer ${provider.token}`,
        Accept: 'application/vnd.github.v3+json',
    };

    // Find and delete previous QualityHub comment
    try {
        const { data: comments } = await axios.get(baseUrl, { headers });
        for (const comment of comments) {
            if (comment.body && comment.body.includes(COMMENT_SIGNATURE)) {
                await axios.delete(`${provider.apiUrl}/repos/${provider.projectId}/issues/comments/${comment.id}`, { headers });
            }
        }
    } catch {
        // Ignore errors when cleaning old comments
    }

    // Post new comment
    const { data } = await axios.post(baseUrl, { body }, { headers });

    console.log(chalk.green('\n✅ Comment posted on GitHub PR'));
    console.log(chalk.gray(`   PR #${provider.mergeRequestId} · Comment #${data.id}`));
}