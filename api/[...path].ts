import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const expressReq = req as any;
  const expressRes = res as any;

  // Reconstruct the full path with /api prefix for Express routing.
  // Vercel strips /api from req.url before calling the function.
  const originalUrl = req.url || '/';
  expressReq.url = `/api${originalUrl.split('?')[0]}`;

  // Route to the existing Express app without altering the API logic in server.ts.
  return new Promise<void>((resolve, reject) => {
    app(expressReq, expressRes, (err?: unknown) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });

    expressRes.on('finish', () => resolve());
    expressRes.on('close', () => resolve());
  });
}
