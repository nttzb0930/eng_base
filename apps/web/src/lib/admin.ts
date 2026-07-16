import { cookies } from "next/headers";

export const getIsAdmin = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("user_token")?.value;
  if (!token) return false;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payloadStr = Buffer.from(parts[1], "base64url").toString("utf8");
    const payload = JSON.parse(payloadStr);
    return payload.role === "ADMIN";
  } catch {
    return false;
  }
};
