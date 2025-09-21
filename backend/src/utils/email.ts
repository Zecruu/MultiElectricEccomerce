import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

export function getTransporter() {
  if (transporter) return transporter;
  if (!env.EMAIL_HOST || !env.EMAIL_USER || !env.EMAIL_PASS) {
    console.warn('Email not configured; emails will be logged to console.');
    return null;
  }
  transporter = nodemailer.createTransport({
    host: env.EMAIL_HOST,
    port: env.EMAIL_PORT ? parseInt(env.EMAIL_PORT, 10) : 587,
    secure: false,
    auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
  });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string) {
  const t = getTransporter();
  if (!t) {
    console.log('EMAIL (mock):', { to, subject, html });
    return;
  }
  await t.sendMail({ from: env.EMAIL_USER, to, subject, html });
}

