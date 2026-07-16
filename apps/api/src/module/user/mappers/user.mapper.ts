import type { users } from "@prisma/client";

export const mapUser = (user: users) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});
