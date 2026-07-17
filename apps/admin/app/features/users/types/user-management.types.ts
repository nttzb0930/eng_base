export interface User {
  id: string;
  username: string;
  email: string;
  role: "ADMIN" | "USER";
  createdAt: string;
}

export type ListUsersQuery = {
  page?: number;
  limit?: number;
  search?: string;
};

export type CreateUserBody = {
  username: string;
  email: string;
  password: string;
  role?: "ADMIN" | "USER";
};

export type UpdateUserBody = {
  username?: string;
  email?: string;
  password?: string;
  role?: "ADMIN" | "USER";
};

export type PaginatedUsersResponse = {
  data: User[];
  pagination?: { totalPages: number; total?: number };
};
