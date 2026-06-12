import nodemailer from "nodemailer";
import type { Region } from "@/lib/db";

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP configuration is incomplete");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

function periodSlug(period: string): string {
  return period.replace(/\s+/g, "_");
}

export async function sendReportEmail(options: {
  region: Region;
  recipients: string[];
  zipBuffer: Buffer;
  period: string;
}): Promise<void> {
  const { region, recipients, zipBuffer, period } = options;

  if (recipients.length === 0) {
    throw new Error(`No enabled recipients for ${region}`);
  }

  const fromName = process.env.SMTP_FROM_NAME ?? "MIX";
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: recipients.join(", "),
    subject: `MIX ${region} Monthly Fleet Reports — ${period}`,
    text: `Please find attached the MIX ${region} fleet reports for ${period}.\n\nGenerated automatically by MIX Report Automation.`,
    html: `
      <p>Please find attached the <strong>MIX ${region}</strong> fleet reports for <strong>${period}</strong>.</p>
      <p style="color:#666;font-size:12px;">Generated automatically by MIX Report Automation.</p>
    `,
    attachments: [
      {
        filename: `MIX_${region}_Reports_${periodSlug(period)}.zip`,
        content: zipBuffer,
        contentType: "application/zip",
      },
    ],
  });
}

export async function sendScheduledReportEmail(options: {
  recipients: string[];
  ukZip: Buffer;
  zaZip: Buffer;
  period: string;
}): Promise<void> {
  const { recipients, ukZip, zaZip, period } = options;

  if (recipients.length === 0) {
    throw new Error("No enabled recipients configured");
  }

  const fromName = process.env.SMTP_FROM_NAME ?? "MIX";
  const fromEmail = process.env.SMTP_FROM_EMAIL ?? process.env.SMTP_USER;
  const slug = periodSlug(period);

  const transporter = getTransporter();

  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    to: recipients.join(", "),
    subject: `MIX Fleet Reports — ${period}`,
    text: `Please find attached UK and ZA fleet reports for ${period}.\n\nGenerated automatically by MIX Report Automation.`,
    html: `
      <p>Please find attached <strong>UK</strong> and <strong>ZA</strong> fleet reports for <strong>${period}</strong>.</p>
      <p style="color:#666;font-size:12px;">Generated automatically by MIX Report Automation.</p>
    `,
    attachments: [
      {
        filename: `MIX_UK_Reports_${slug}.zip`,
        content: ukZip,
        contentType: "application/zip",
      },
      {
        filename: `MIX_ZA_Reports_${slug}.zip`,
        content: zaZip,
        contentType: "application/zip",
      },
    ],
  });
}
