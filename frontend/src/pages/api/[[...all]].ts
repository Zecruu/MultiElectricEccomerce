import type { NextApiRequest, NextApiResponse } from 'next';

// Disable Next's body parsing so Express (including raw body for Stripe webhooks) can handle it
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

let cachedApp: unknown;
async function getExpressApp(): Promise<unknown> {
  if (!cachedApp) {
    // Import the backend Express app builder (outside Next app directory)
    const mod = await import('@backend/src/app');
    cachedApp = await mod.getApp();
  }
  return cachedApp;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const app = (await getExpressApp()) as (req: unknown, res: unknown) => void;
  app(req, res);
}
