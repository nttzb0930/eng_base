import { clientApiRequest } from "@/src/lib/client-api-request";
import type { PracticeSessionResultInput } from "@/src/modules/practice/session-results";

export const recordPracticeSessionResult = (input: PracticeSessionResultInput) =>
  clientApiRequest<unknown>("/practice/sessions", { method: "POST", body: input });
