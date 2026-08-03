import { NotFoundException } from "@nestjs/common";

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
