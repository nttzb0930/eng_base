import { Injectable } from "@nestjs/common";

import { SystemSettingsReader } from "../system-settings.reader";

@Injectable()
export class GetSystemSettingsUseCase {
  constructor(private readonly settings: SystemSettingsReader) {}

  execute() {
    return this.settings.getAll();
  }
}
