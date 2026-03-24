import http from "http";
import https from "https";

interface LlmResponse {
  description: string;
  data: unknown;
  summary: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async get(path: string): Promise<LlmResponse> {
    const url = `${this.baseUrl}${path}`;

    return new Promise((resolve, reject) => {
      const client = url.startsWith("https") ? https : http;
      client
        .get(url, (res) => {
          let data = "";
          res.on("data", (chunk: string) => (data += chunk));
          res.on("end", () => {
            try {
              resolve(JSON.parse(data) as LlmResponse);
            } catch {
              reject(new Error(`Invalid JSON from ${url}: ${data.slice(0, 200)}`));
            }
          });
        })
        .on("error", reject);
    });
  }
}
