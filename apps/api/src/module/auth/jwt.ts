import * as crypto from "crypto";

export function signJwt(
  payload: object,
  secret: string,
  expiresInSeconds?: number
): string {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header)).toString(
    "base64url"
  );
  const now = Math.floor(Date.now() / 1000);
  const claims = expiresInSeconds
    ? { ...payload, iat: now, exp: now + expiresInSeconds }
    : payload;
  const encodedPayload = Buffer.from(JSON.stringify(claims)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export type JwtPayload = {
  userId?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
};

export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(`${header}.${payload}`)
    .digest("base64url");
  if (signature !== expectedSignature) return null;
  try {
    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as JwtPayload;
    if (decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
