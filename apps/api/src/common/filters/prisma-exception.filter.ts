import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";

    switch (exception.code) {
      case "P2002":
        status = HttpStatus.CONFLICT;
        message = "Record already exists (unique constraint violation)";
        break;
      case "P2003":
        status = HttpStatus.BAD_REQUEST;
        message = "Related record not found (foreign key constraint violation)";
        break;
      case "P2025":
        status = HttpStatus.NOT_FOUND;
        message = "Record not found";
        break;
      default:
        message = `Database error: ${exception.message}`;
        break;
    }

    response.status(status).json({
      statusCode: status,
      message: message,
      error: exception.code,
    });
  }
}
