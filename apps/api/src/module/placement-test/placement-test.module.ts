import { Module } from "@nestjs/common";
import { PrismaModule } from "../../database/prisma/prisma.module";
import { PlacementTestController } from "./placement-test.controller";
import { PlacementTestService } from "./placement-test.service";

@Module({
  imports: [PrismaModule],
  controllers: [PlacementTestController],
  providers: [PlacementTestService],
  exports: [PlacementTestService],
})
export class PlacementTestModule {}
