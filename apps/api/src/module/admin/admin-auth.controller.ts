import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  Inject,
} from "@nestjs/common";
import { type ConfigType } from "@nestjs/config";
import jwtConfig from "../../config/jwt.config";
import { PrismaService } from "../../prisma/prisma.service";
import { verifyPassword } from "../../auth/password";
import { signJwt } from "../../auth/jwt";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(jwtConfig.KEY)
    private readonly jwtCfg: ConfigType<typeof jwtConfig>
  ) { }

  @Post("login")
  async login(@Body() body: any) {
    const { username, password } = body;

    // Tìm user theo username hoặc email (giống ec)
    const user = await this.prisma.users.findFirst({
      where: {
        OR: [{ username }, { email: username }],
      },
    });

    // Kiểm tra tồn tại và role ADMIN
    if (!user || user.role !== "ADMIN") {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    // Xác thực mật khẩu
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      throw new UnauthorizedException("INVALID_CREDENTIALS");
    }

    // Ký token bằng secret từ config
    const token = signJwt(
      { userId: user.id, role: user.role },
      this.jwtCfg.accessSecret
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
    };
  }
}
