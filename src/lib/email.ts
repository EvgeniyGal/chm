import FormData from "form-data";
import Mailgun from "mailgun.js";

import { env } from "@/lib/env";

const SYSTEM_FROM_EMAIL = env.EMAIL_FROM ?? "yevgen@support.aiautomations.work";

type MailgunClient = {
  messages: {
    create: (
      domain: string,
      data: {
        from: string;
        to: string[];
        subject: string;
        text: string;
        html: string;
      },
    ) => Promise<unknown>;
  };
};

let mailgunClient: MailgunClient | null = null;

function getMailgunClient() {
  if (mailgunClient) return mailgunClient;
  if (!env.MAILGUN_API_KEY || !env.MAILGUN_DOMAIN) {
    throw new Error("MAILGUN_NOT_CONFIGURED");
  }
  const mailgun = new Mailgun(FormData);
  mailgunClient = mailgun.client({
    username: "api",
    key: env.MAILGUN_API_KEY,
    url: env.MAILGUN_EU_REGION === "true" ? "https://api.eu.mailgun.net" : undefined,
  });
  return mailgunClient;
}

export async function sendAuthEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}) {
  const mg = getMailgunClient();
  await mg.messages.create(env.MAILGUN_DOMAIN!, {
    from: SYSTEM_FROM_EMAIL,
    to: [to],
    subject,
    html,
    text,
  });
}

export function appBaseUrl() {
  const raw = env.APP_URL ?? env.NEXTAUTH_URL ?? "http://localhost:3000";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("localhost:") || raw.startsWith("127.0.0.1:")) return `http://${raw}`;
  return `https://${raw}`;
}

