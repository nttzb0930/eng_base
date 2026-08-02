import { registerAs } from "@nestjs/config";

function integer(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isInteger(parsed) ? parsed : fallback;
}

export default registerAs("mail", () => {
  const appName = process.env.APP_NAME?.trim() || "English Base";
  const user = process.env.SMTP_USER?.trim() || "";
  const from =
    process.env.SMTP_FROM?.trim() ||
    (user ? `"${appName}" <${user}>` : `"${appName}" <noreply@localhost>`);

  return {
    enabled: process.env.SMTP_ENABLED === "true",
    host: process.env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port: integer(process.env.SMTP_PORT, 587),
    secure: process.env.SMTP_SECURE === "true",
    user,
    pass: process.env.SMTP_PASS || "",
    from,
    appName,
    templatesPath:
      process.env.EMAIL_TEMPLATES_PATH?.trim() || "src/module/mail/templates",
  };
});
