import assert from "node:assert/strict";
import test from "node:test";
import { resolve } from "node:path";

import { MailService } from "../mail.service";

test("mail service sends a registration welcome email through SMTP", async () => {
  const sendMail = async (message: Record<string, unknown>) => {
    sent.push(message);
    return { messageId: "message-1" };
  };
  const sent: Record<string, unknown>[] = [];
  const service = new MailService(
    {
      enabled: true,
      host: "smtp.example.test",
      port: 587,
      secure: false,
      user: "mailer@example.test",
      pass: "secret",
      from: '"English Base" <mailer@example.test>',
      appName: "English Base",
      templatesPath: resolve(
        process.cwd(),
        "apps/api/src/module/mail/templates"
      ),
    },
    { sendMail }
  );

  await service.sendRegistrationEmail({
    to: "learner@example.com",
    fullName: "Learner <One>",
  });

  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0], {
    from: '"English Base" <mailer@example.test>',
    to: "learner@example.com",
    subject: "Chào mừng bạn đến với English Base",
    text: "Chào Learner <One>,\n\nTài khoản English Base của bạn đã được tạo thành công.",
    html: expectHtml(),
  });
});

test("mail service skips delivery when SMTP is disabled", async () => {
  let called = false;
  const service = new MailService(
    {
      enabled: false,
      host: "smtp.example.test",
      port: 587,
      secure: false,
      user: "",
      pass: "",
      from: "English Base <noreply@example.test>",
      appName: "English Base",
      templatesPath: resolve(
        process.cwd(),
        "apps/api/src/module/mail/templates"
      ),
    },
    {
      sendMail: async () => {
        called = true;
        return { messageId: "unused" };
      },
    }
  );

  await service.sendRegistrationEmail({
    to: "learner@example.com",
    fullName: "Learner",
  });

  assert.equal(called, false);
});

test("mail service renders a verification code template", async () => {
  const sent: Record<string, unknown>[] = [];
  const service = new MailService(
    {
      enabled: true,
      host: "smtp.example.test",
      port: 587,
      secure: false,
      user: "mailer@example.test",
      pass: "secret",
      from: '"English Base" <mailer@example.test>',
      appName: "English Base",
      templatesPath: resolve(
        process.cwd(),
        "apps/api/src/module/mail/templates"
      ),
    },
    {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: "verification-1" };
      },
    }
  );

  await service.sendVerificationEmail({
    to: "learner@example.com",
    code: "123456",
    expiresInMinutes: 10,
  });

  assert.match(String(sent[0].text), /123456/);
  assert.match(String(sent[0].html), /123456/);
  assert.match(String(sent[0].subject), /Xác thực/);
});

test("mail service renders a password reset code template", async () => {
  const sent: Record<string, unknown>[] = [];
  const service = new MailService(
    {
      enabled: true,
      host: "smtp.example.test",
      port: 587,
      secure: false,
      user: "mailer@example.test",
      pass: "secret",
      from: '"English Base" <mailer@example.test>',
      appName: "English Base",
      templatesPath: resolve(
        process.cwd(),
        "apps/api/src/module/mail/templates"
      ),
    },
    {
      sendMail: async (message) => {
        sent.push(message);
        return { messageId: "reset-1" };
      },
    }
  );

  await service.sendPasswordResetEmail({
    to: "learner@example.com",
    code: "654321",
    expiresInMinutes: 10,
  });

  assert.match(String(sent[0].text), /654321/);
  assert.match(String(sent[0].html), /654321/);
  assert.match(String(sent[0].subject), /Đặt lại mật khẩu/);
});

function expectHtml() {
  return `<div class="email-body">
  <p>Chào <strong>Learner &lt;One&gt;</strong>,</p>
  <p>Tài khoản English Base của bạn đã được tạo thành công.</p>
</div>`;
}
