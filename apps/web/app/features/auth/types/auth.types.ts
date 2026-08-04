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

export type RegisterResponse = {
  success: true;
  verificationRequired: true;
  email: string;
};

export type VerifyEmailBody = {
  email: string;
  code: string;
};

export type RequestPasswordResetBody = {
  email: string;
};

export type ResetPasswordBody = {
  email: string;
  code: string;
  newPassword: string;
};

export type LoginResponse = {
  access_token: string;
  user: AuthUser;
};
