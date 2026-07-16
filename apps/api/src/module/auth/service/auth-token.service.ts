import { Inject, Injectable } from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import * as crypto from "node:crypto";

import jwtConfig from "../../../config/jwt.config";

export type AuthTokenPayload = {
  userId?: string;
  role?: string;
  iat?: number;
  exp?: number;
  [claim: string]: unknown;
};

const ACCESS_SECONDS = 15 * 60;
const REFRESH_SECONDS = 7 * 24 * 60 * 60;

@Injectable()
export class AuthTokenService {
  readonly accessMaxAgeMs = ACCESS_SECONDS * 1000;
  readonly refreshMaxAgeMs = REFRESH_SECONDS * 1000;

  constructor(
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>
  ) {}

  createAccessToken(userId: string, role: string) {
    return this.sign(
      { userId, role },
      this.config.accessSecret,
      ACCESS_SECONDS
    );
  }

  createRefreshToken(userId: string, role: string) {
    return this.sign(
      { userId, role },
      this.config.refreshSecret,
      REFRESH_SECONDS
    );
  }

  createAdminCompatibilityToken(userId: string, role: string) {
    return this.sign({ userId, role }, this.config.accessSecret);
  }

  verifyAccessToken(token: string) {
    return this.verify(token, this.config.accessSecret);
  }

  verifyRefreshToken(token: string) {
    return this.verify(token, this.config.refreshSecret);
  }

  private sign(payload: object, secret: string, expiresInSeconds?: number) {
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

  private verify(token: string, secret: string): AuthTokenPayload | null {
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
      ) as AuthTokenPayload;
      return decoded.exp && decoded.exp <= Math.floor(Date.now() / 1000)
        ? null
        : decoded;
    } catch {
      return null;
    }
  }
}
