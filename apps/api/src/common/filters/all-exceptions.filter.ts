import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import type { Request, Response } from "express";

import {
  attachRequestId,
  getRequestMetadata,
  type RequestWithMetadata,
} from "../http/request-metadata";
import { ApplicationLogger } from "../logging";

type ErrorResponse = Record<string, unknown>;

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: ApplicationLogger) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>() as RequestWithMetadata;
    const response = http.getResponse<Response>();
    if (!request.requestId) attachRequestId(request, response);

    const { status, body, errorCode } = this.toResponse(exception);
    const metadata = {
      ...getRequestMetadata(request, response),
      operation: `${request.method} ${request.originalUrl || request.url}`,
      outcome: status >= 500 ? "failed" : "rejected",
      statusCode: status,
      errorCode,
      errorName: exception instanceof Error ? exception.name : "UnknownError",
      reason: this.getInternalReason(exception),
      ...(status >= 500 && exception instanceof Error
        ? { stack: exception.stack }
        : {}),
    };

    if (status >= 500) {
      this.logger.error("HTTP request failed", metadata, "HTTP");
    } else {
      this.logger.warn("HTTP request rejected", metadata, "HTTP");
    }
    response.status(status).json({ ...body, requestId: request.requestId });
  }

  private toResponse(exception: unknown): {
    status: number;
    body: ErrorResponse;
    errorCode: string;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      return this.fromPrisma(exception);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body =
        typeof payload === "string"
          ? { statusCode: status, message: payload }
          : (payload as ErrorResponse);
      return {
        status,
        body,
        errorCode: this.readErrorCode(body, exception.name),
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal server error",
        error: "Internal Server Error",
      },
      errorCode: "INTERNAL_SERVER_ERROR",
    };
  }

  private fromPrisma(exception: Prisma.PrismaClientKnownRequestError) {
    const mapped = {
      P2002: {
        status: HttpStatus.CONFLICT,
        message: "Record already exists (unique constraint violation)",
      },
      P2003: {
        status: HttpStatus.BAD_REQUEST,
        message: "Related record not found (foreign key constraint violation)",
      },
      P2025: {
        status: HttpStatus.NOT_FOUND,
        message: "Record not found",
      },
    }[exception.code] ?? {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: "Internal server error",
    };
    return {
      status: mapped.status,
      body: {
        statusCode: mapped.status,
        message: mapped.message,
        error: exception.code,
      },
      errorCode: exception.code,
    };
  }

  private readErrorCode(body: ErrorResponse, fallback: string) {
    const message = body.message;
    return typeof message === "string" ? message : fallback;
  }

  private getInternalReason(exception: unknown) {
    if (!(exception instanceof Error) || !("cause" in exception))
      return undefined;
    const cause = exception.cause;
    return cause instanceof Error ? cause.message : undefined;
  }
}
