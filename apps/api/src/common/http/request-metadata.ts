import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export type RequestWithMetadata = Request & { requestId?: string };

const REQUEST_ID_PATTERN = /^[a-zA-Z0-9._:-]{1,128}$/;

export function attachRequestId(
  request: RequestWithMetadata,
  response: Response
) {
  const supplied = request.header("x-request-id");
  const requestId =
    supplied && REQUEST_ID_PATTERN.test(supplied) ? supplied : randomUUID();
  request.requestId = requestId;
  response.setHeader("x-request-id", requestId);
  return requestId;
}

export function getRequestMetadata(
  request: RequestWithMetadata,
  response: Response
) {
  return {
    requestId: request.requestId,
    method: request.method,
    path: request.originalUrl || request.url,
    statusCode: response.statusCode,
    ip: request.ip,
    userAgent: request.header("user-agent"),
  };
}
