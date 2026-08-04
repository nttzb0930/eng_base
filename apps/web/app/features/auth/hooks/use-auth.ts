"use client";

import { createContext, useContext } from "react";

import { getAuthSession } from "../store/auth-session.store";
import type {
  LoginBody,
  RegisterBody,
  RegisterResponse,
} from "../types/auth.types";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AuthContextValue = {
  status: AuthStatus;
  login: (body: LoginBody) => Promise<void>;
  register: (body: RegisterBody) => Promise<RegisterResponse>;
  logout: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside Providers");
  return { ...value, ...getAuthSession() };
}
