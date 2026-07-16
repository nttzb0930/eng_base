import { Injectable, Logger } from "@nestjs/common";

import { redactLogValue } from "./log-redaction";

export type LogMetadata = Record<string, unknown>;

@Injectable()
export class ApplicationLogger {
  private readonly logger = new Logger(ApplicationLogger.name);

  info(message: string, metadata: LogMetadata = {}, context = "APP") {
    this.logger.log(this.entry(message, metadata, context));
  }

  warn(message: string, metadata: LogMetadata = {}, context = "APP") {
    this.logger.warn(this.entry(message, metadata, context));
  }

  error(message: string, metadata: LogMetadata = {}, context = "APP") {
    this.logger.error(this.entry(message, metadata, context));
  }

  private entry(message: string, metadata: LogMetadata, context: string) {
    const safeMetadata = redactLogValue(metadata) as LogMetadata;
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      levelContext: context,
      message,
      ...safeMetadata,
    });
  }
}
