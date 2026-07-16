import { AsyncLocalStorage } from "node:async_hooks";

type RequestAuth = {
  userId: string;
};

const requestAuth = new AsyncLocalStorage<RequestAuth>();

export function runWithAuth(value: RequestAuth, fn: () => void) {
  requestAuth.run(value, fn);
}

export async function auth() {
  return {
    userId: requestAuth.getStore()?.userId ?? null,
  };
}

export async function currentUser() {
  const userId = requestAuth.getStore()?.userId;
  if (!userId) return null;

  return {
    id: userId,
    firstName: null,
    imageUrl: null,
  };
}
