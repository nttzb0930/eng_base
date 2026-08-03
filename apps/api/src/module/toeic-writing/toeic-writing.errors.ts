import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";

import { WritingAiInvalidResponseError } from "./provider/gemini-writing.provider";
import {
  WritingAiDailyQuotaExceededError,
  WritingAiIdempotencyConflictError,
  WritingAiInFlightError,
  WritingAiReservationInvalidError,
} from "./repository/writing-ai.repository";

export function writingTaskNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: "WRITING_TASK_NOT_FOUND",
    message: "TOEIC Writing task not found",
  });
}

export function writingImageNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: "WRITING_IMAGE_NOT_FOUND",
    message: "TOEIC Writing image not found",
  });
}

export function writingResponseInvalid(issues?: unknown[]): never {
  throw new BadRequestException({
    statusCode: 400,
    code: "WRITING_RESPONSE_INVALID",
    message: "TOEIC Writing response is invalid",
    ...(issues ? { issues } : {}),
  });
}

export function writingContentVersionConflict(): never {
  throw new ConflictException({
    statusCode: 409,
    code: "WRITING_CONTENT_VERSION_CONFLICT",
    message: "TOEIC Writing content version has changed",
  });
}

export function writingSubmissionKeyConflict(): never {
  throw new ConflictException({
    statusCode: 409,
    code: "WRITING_SUBMISSION_KEY_CONFLICT",
    message: "TOEIC Writing submission key was already used",
  });
}

export function writingSubmissionNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: "WRITING_SUBMISSION_NOT_FOUND",
    message: "TOEIC Writing submission not found",
  });
}

export function writingGradeNotFound(): never {
  throw new NotFoundException({
    statusCode: 404,
    code: "WRITING_GRADE_NOT_FOUND",
    message: "TOEIC Writing grade not found",
  });
}

export function mapWritingAiError(error: unknown): never {
  if (error instanceof WritingAiDailyQuotaExceededError) {
    throw new HttpException(
      {
        statusCode: 429,
        code: "WRITING_AI_DAILY_QUOTA_EXCEEDED",
        message: "TOEIC Writing AI daily quota exceeded",
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
  if (error instanceof WritingAiInFlightError) {
    throw new ConflictException({
      statusCode: 409,
      code: "WRITING_AI_IN_FLIGHT",
      message: "A TOEIC Writing AI request is already in progress",
    });
  }
  if (error instanceof WritingAiIdempotencyConflictError) {
    throw new ConflictException({
      statusCode: 409,
      code: "WRITING_AI_IDEMPOTENCY_CONFLICT",
      message: "The request key was already used for another response",
    });
  }
  if (error instanceof WritingAiReservationInvalidError) {
    throw new ConflictException({
      statusCode: 409,
      code: "WRITING_AI_RESERVATION_INVALID",
      message: "The TOEIC Writing AI reservation is no longer valid",
    });
  }
  if (error instanceof WritingAiInvalidResponseError) {
    throw new BadGatewayException({
      statusCode: 502,
      code: "WRITING_AI_INVALID_RESPONSE",
      message: "TOEIC Writing AI returned an invalid response",
    });
  }
  if (error instanceof Error && error.name === "AbortError") {
    throw new GatewayTimeoutException({
      statusCode: 504,
      code: "WRITING_AI_TIMEOUT",
      message: "TOEIC Writing AI timed out",
    });
  }
  throw new ServiceUnavailableException({
    statusCode: 503,
    code: "WRITING_AI_UNAVAILABLE",
    message: "TOEIC Writing AI is unavailable",
  });
}
