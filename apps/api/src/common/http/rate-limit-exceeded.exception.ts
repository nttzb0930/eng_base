import { HttpException, HttpStatus } from "@nestjs/common";

export class RateLimitExceededException extends HttpException {
  constructor(retryAfterSeconds: number) {
    super(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        error: "Too Many Requests",
        code: "RATE_LIMIT_EXCEEDED",
        message: "Too many requests. Please try again later.",
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS
    );
  }
}

