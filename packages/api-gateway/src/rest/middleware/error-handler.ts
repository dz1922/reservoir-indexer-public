import { Response, NextFunction } from "express";
import type { Request } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  res.status(500).json({
    description: "An error occurred",
    data: null,
    summary: err.message,
  });
}
