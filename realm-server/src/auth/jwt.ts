import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export type AuthClaims = {
  address: string;
  gotchiId?: string;
};

export function signAuthToken(claims: AuthClaims): string {
  return jwt.sign(
    {
      address: claims.address.toLowerCase(),
      gotchiId: claims.gotchiId,
    },
    env.jwtSecret,
    { expiresIn: env.jwtTtlSeconds },
  );
}

export function verifyAuthToken(token: string): AuthClaims {
  const payload = jwt.verify(token, env.jwtSecret) as AuthClaims & { address: string };
  if (!payload?.address) {
    throw new Error('Invalid token payload');
  }
  return {
    address: payload.address.toLowerCase(),
    gotchiId: payload.gotchiId,
  };
}
