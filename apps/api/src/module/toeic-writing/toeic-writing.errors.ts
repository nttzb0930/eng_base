import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";

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

export function writingResponseInvalid(): never {
  throw new BadRequestException({
    statusCode: 400,
    code: "WRITING_RESPONSE_INVALID",
    message: "TOEIC Writing response is invalid",
  });
}

export function writingContentVersionConflict(): never {
  throw new ConflictException({
    statusCode: 409,
    code: "WRITING_CONTENT_VERSION_CONFLICT",
    message: "TOEIC Writing content version has changed",
  });
}
