import { timingSafeEqual } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

function matches(provided: string | string[] | undefined, expected: string | undefined): boolean {
  if (!expected || typeof provided !== 'string') return false;
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer);
}

/**
 * Rejects any request that didn't come through the ParkLink gateway (X-Gateway-Secret) or
 * from another ParkLink service (X-Internal-Key). Every controller here trusts x-user-id as
 * already verified -- true only for gateway-forwarded requests -- so if this service is
 * reachable directly (e.g. its own public URL on a PaaS) anyone could otherwise send that
 * header themselves. With neither secret configured (a bare local run outside docker
 * compose) every request passes.
 */
export function trustedCallerMiddleware(gatewaySecret?: string, internalKey?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!gatewaySecret && !internalKey) return next();
    if (matches(req.headers['x-gateway-secret'], gatewaySecret) || matches(req.headers['x-internal-key'], internalKey)) {
      return next();
    }
    res.status(401).json({ code: 'UNTRUSTED_CALLER', error: 'requests must go through the gateway' });
  };
}
