import assert from "node:assert/strict";
import test from "node:test";

import type { ExecutionContext } from "@nestjs/common";
import type { ConfigService } from "@nestjs/config";
import type { ThrottlerStorage } from "@nestjs/throttler";

import { WritingAiRateLimitGuard } from "../guards/writing-ai-rate-limit.guard";

function harness() {
  const hits = new Map<string, number>();
  const storage: ThrottlerStorage = {
    increment: (key, _ttl, limit) => {
      const totalHits = (hits.get(key) ?? 0) + 1;
      hits.set(key, totalHits);
      return Promise.resolve({
        totalHits,
        timeToExpire: 60_000,
        isBlocked: totalHits > limit,
        timeToBlockExpire: 60_000,
      });
    },
  };
  const config = {
    get: () => ({ userLimit: 2, ipLimit: 10, ttlMs: 60_000 }),
  } as unknown as ConfigService;
  const guard = new WritingAiRateLimitGuard(storage, config);
  const request = (userId: string, ip = "127.0.0.1") => {
    const headers = new Map<string, string>();
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ auth: { userId }, ip }),
        getResponse: () => ({
          setHeader: (name: string, value: string) => headers.set(name, value),
        }),
      }),
    } as unknown as ExecutionContext;
    return { context, headers };
  };
  return { guard, request };
}

test("Writing AI blocks the third request for one learner", async () => {
  const { guard, request } = harness();
  await guard.canActivate(request("learner-1").context);
  await guard.canActivate(request("learner-1").context);
  const third = request("learner-1");
  await assert.rejects(() => guard.canActivate(third.context));
  assert.equal(third.headers.get("Retry-After"), "60");
});

test("Writing AI blocks the eleventh learner behind one IP", async () => {
  const { guard, request } = harness();
  for (let index = 1; index <= 10; index += 1) {
    await guard.canActivate(request(`learner-${index}`).context);
  }
  await assert.rejects(() => guard.canActivate(request("learner-11").context));
});
