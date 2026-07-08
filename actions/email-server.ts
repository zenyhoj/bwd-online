"use server";

import nodemailer from "nodemailer";
import { serverEnv } from "@/lib/env";

const isEmailConfigured = Boolean(serverEnv.SMTP_USER && serverEnv.SMTP_PASS);

let transporter: nodemailer.Transporter | null = null;

if (isEmailConfigured) {
  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: serverEnv.SMTP_USER,
      pass: serverEnv.SMTP_PASS,
    },
  });
}

export async function sendEmailAction(
  to: string | string[],
  subject: string,
  html: string
): Promise<{ success: boolean; error?: string }> {
  if (!transporter) {
    console.warn("Email notification skipped: SMTP credentials are not configured.");
    return { success: false, error: "Email notifications are not configured." };
  }

  try {
    const from = serverEnv.EMAIL_FROM || "BWD Online <noreply@bwd-online.com>";
    
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
    
    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error?.message || "Failed to send email" };
  }
}

export async function getAdminEmail(): Promise<string> {
  return serverEnv.ADMIN_EMAIL || "buenawater@gmail.com";
}

export async function sendWorkflowEmail(to: string | string[], subject: string, messageHtml: string) {
  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-w-2xl margin: 0 auto; padding: 20px; color: #333;">
      <h2 style="color: #0f172a; margin-bottom: 24px;">BWD Online Notification</h2>
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        ${messageHtml}
      </div>
      <p style="margin-top: 32px; font-size: 12px; color: #64748b;">
        This is an automated message from the BWD Online System. Please do not reply directly to this email.
      </p>
    </div>
  `;
  
  return sendEmailAction(to, subject, htmlTemplate);
}

