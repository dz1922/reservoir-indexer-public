import { Response } from "express";

export interface LlmResponse<T = unknown> {
  description: string;
  data: T;
  summary: string;
}

export function sendLlmResponse<T>(
  res: Response,
  description: string,
  data: T,
  summary: string
): void {
  const response: LlmResponse<T> = { description, data, summary };
  res.json(response);
}
