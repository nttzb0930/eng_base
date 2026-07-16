import {
  UserCreateDto as UserCreateBody,
  UserUpdateDto as UserBody,
} from "./dto/admin.dto";

export {
  UserCreateBody,
  UserBody,
};

export const mapUser = (user: any) => ({
  id: user.id,
  username: user.username,
  email: user.email,
  fullName: user.full_name,
  role: user.role,
  createdAt: user.created_at,
  updatedAt: user.updated_at,
});
