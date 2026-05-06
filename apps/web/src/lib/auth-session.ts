let accessToken: string | null = null;
let authBootstrapPromise: Promise<void> | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(nextToken: string | null): void {
  accessToken = nextToken;
}

export function setAuthBootstrapPromise(next: Promise<void>): void {
  authBootstrapPromise = next.finally(() => {
    authBootstrapPromise = null;
  });
}

export function waitForAuthBootstrap(): Promise<void> {
  return authBootstrapPromise ?? Promise.resolve();
}
