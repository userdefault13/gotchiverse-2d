import { Router, Request, Response } from 'express';
import { verifyMessage } from 'ethers';
import { env } from '../config/env';
import { getFoundryConfigResponse } from '../config/foundry';
import { buildSignMessage, consumeNonce, issueNonce, peekNonce } from '../auth/nonce';
import { signAuthToken } from '../auth/jwt';

export function createHttpRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'gotchiverse-realm-server',
      map: 'citaadel',
      publicUrl: env.publicUrl,
      time: new Date().toISOString(),
    });
  });

  router.get('/realm/config/list', (_req, res) => {
    res.json({
      data: {
        requireMetaMaskSign: true,
        maps: ['citaadel'],
        netcode: 'colyseus',
        colyseusUrl: env.publicUrl,
        roomName: 'citaadel',
      },
    });
  });

  router.get('/foundry/config', (_req, res) => {
    res.json(getFoundryConfigResponse());
  });

  router.get('/user/nonce/get', (req: Request, res: Response) => {
    const address = String(req.query.address || '');
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      res.status(400).json({ error: 'Invalid address' });
      return;
    }
    const nonce = issueNonce(address);
    const message = buildSignMessage(address, nonce);
    // Flat fields match legacy Gotchiverse FE (signs `nonce` via signMessage).
    res.json({
      nonce,
      message,
      data: { nonce, message },
    });
  });

  router.get('/user/authtoken/get', async (req: Request, res: Response) => {
    try {
      const address = String(req.query.address || '');
      const signature = String(req.query.signature || '');
      const gotchiId = req.query.gotchiId ? String(req.query.gotchiId) : undefined;

      if (!/^0x[a-fA-F0-9]{40}$/.test(address) || !signature) {
        res.status(400).json({ error: 'address and signature are required' });
        return;
      }

      const nonce = peekNonce(address);
      if (!nonce) {
        res.status(400).json({ error: 'Nonce missing or expired; request a new nonce' });
        return;
      }

      // Legacy FE calls signer.signMessage(nonce). Also accept the structured message.
      let recovered: string;
      try {
        recovered = verifyMessage(nonce, signature);
      } catch {
        recovered = verifyMessage(buildSignMessage(address, nonce), signature);
      }
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        res.status(401).json({ error: 'Signature verification failed' });
        return;
      }

      if (!consumeNonce(address, nonce)) {
        res.status(400).json({ error: 'Nonce already used' });
        return;
      }

      const token = signAuthToken({ address, gotchiId });
      res.json({
        token,
        authToken: token,
        data: {
          authToken: token,
          token,
          address: address.toLowerCase(),
          gotchiId,
          expiresIn: env.jwtTtlSeconds,
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.status(401).json({ error: message });
    }
  });

  /**
   * Compatibility shim for the legacy FE socket lookup.
   * Returns Colyseus endpoint info instead of a raw zone WebSocket URL.
   */
  router.get('/realm/socket', (req: Request, res: Response) => {
    const owner = String(req.query.owner || '');
    const gotchi = String(req.query.gotchi || '');
    const map = String(req.query.map || 'citaadel');

    res.json({
      socketUrl: env.publicUrl,
      id: 'citaadel-0',
      roomName: map === 'aarena' ? 'citaadel' : 'citaadel',
      netcode: 'colyseus',
      owner,
      gotchi,
    });
  });

  return router;
}
