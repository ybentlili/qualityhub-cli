import axios, { AxiosInstance } from 'axios';

export interface IngestResponse {
    success: boolean;
    message: string;
    qa_result_id: string;
    risk_score: number;
    risk_status: string;
    decision: string;
}

export class APIClient {
    private client: AxiosInstance;

    constructor(baseURL: string) {
        this.client = axios.create({
            baseURL: `${baseURL}/api/v1`,
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: 30000,
        });
    }

    async ingestQAResult(data: any): Promise<IngestResponse> {
        const response = await this.client.post<IngestResponse>('/results', data);
        return response.data;
    }

    async healthCheck(): Promise<{ status: string; services: Record<string, string> }> {
        const response = await this.client.get('/health');
        return response.data;
    }
}