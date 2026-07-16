import { Global, Module } from "@nestjs/common";

import { ApplicationLogger } from "./application-logger.service";

@Global()
@Module({
  providers: [ApplicationLogger],
  exports: [ApplicationLogger],
})
export class LoggingModule {}
