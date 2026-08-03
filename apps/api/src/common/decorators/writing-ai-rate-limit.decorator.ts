import { UseGuards } from "@nestjs/common";

import { WritingAiRateLimitGuard } from "../guards/writing-ai-rate-limit.guard";

export const WritingAiRateLimit = () => UseGuards(WritingAiRateLimitGuard);
