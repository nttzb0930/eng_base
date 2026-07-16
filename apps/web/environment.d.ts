// This file is needed to support autocomplete for process.env
export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // NestJS API URL used by server-side adapters
      API_URL: string;

      // public app url
      NEXT_PUBLIC_APP_URL: string;

      // clerk admin user id(s) (separated by comma(,) and space( )). Ex: "user_123, user_456, user_789"
      CLERK_ADMIN_IDS: string;
    }
  }
}
