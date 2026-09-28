import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../server';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Reconstruct the full path with /api prefix for Express routing
  // Vercel strips /api from req.url, so we add it back for Express to match its routes
  const pathWithApi = `/api${req.url.split('?')[0]}`;

  // Reconstruct full URL for Express
  req.url = pathWithApi;

  // Route to Express app
  return new Promise<void>((resolve, reject) => {
    app(req, res);

    // Ensure promise resolves when response is finished
    res.on('finish', () => resolve());
    res.on('error', reject);
  });
}
