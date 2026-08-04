import {
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";

export function authBadRequest(publicCode: string, internalReason: string) {
  return withInternalReason(
    new BadRequestException(publicCode),
    internalReason
  );
}

export function authUnauthorized(publicCode: string, internalReason: string) {
  return withInternalReason(
    new UnauthorizedException(publicCode),
    internalReason
  );
}

export function authUnavailable(publicCode: string, internalReason: string) {
  return withInternalReason(
    new ServiceUnavailableException(publicCode),
    internalReason,
  );
}

function withInternalReason<T extends Error>(exception: T, reason: string): T {
  exception.cause = new Error(reason);
  return exception;
}
