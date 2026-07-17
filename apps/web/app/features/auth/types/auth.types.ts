export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: string;
  fullName: string;
};

export type AuthSession = {
  accessToken: string | null;
  user: AuthUser | null;
};

export type LoginBody = {
  username: string;
  password: string;
};

export type RegisterBody = {
  username: string;
  email: string;
  password: string;
  fullName: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};
