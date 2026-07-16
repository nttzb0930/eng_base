import * as bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

/**
 * Hash một mật khẩu plain text bằng bcryptjs.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

/**
 * Xác thực mật khẩu plain text với giá trị đã hash.
 */
export async function verifyPassword(
  plain: string,
  stored: string
): Promise<boolean> {
  return bcrypt.compare(plain, stored);
}
