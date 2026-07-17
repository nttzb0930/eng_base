export type AdminLoginBody = {
  username: string;
  password: string;
};

export type AdminUser = {
  id: string;
  username: string;
  email: string;
  role: "ADMIN";
};

export type AdminLoginResponse = {
  token: string;
  user: AdminUser;
};
