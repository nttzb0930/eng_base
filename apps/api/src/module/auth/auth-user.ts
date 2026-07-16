import type { user_role, users } from "@prisma/client";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: user_role;
  fullName: string;
};

export function toAuthUser(user: users): AuthUser {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.full_name,
  };
}
