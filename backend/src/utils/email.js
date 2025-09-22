"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTransporter = getTransporter;
exports.sendEmail = sendEmail;
const nodemailer_1 = require("nodemailer");
const env_1 = require("../config/env");
let transporter = null;
function getTransporter() {
    if (transporter)
        return transporter;
    if (!env_1.env.EMAIL_HOST || !env_1.env.EMAIL_USER || !env_1.env.EMAIL_PASS) {
        console.warn('Email not configured; emails will be logged to console.');
        return null;
    }
    transporter = nodemailer_1.default.createTransport({
        host: env_1.env.EMAIL_HOST,
        port: env_1.env.EMAIL_PORT ? parseInt(env_1.env.EMAIL_PORT, 10) : 587,
        secure: false,
        auth: { user: env_1.env.EMAIL_USER, pass: env_1.env.EMAIL_PASS },
    });
    return transporter;
}
async function sendEmail(to, subject, html) {
    const t = getTransporter();
    if (!t) {
        console.log('EMAIL (mock):', { to, subject, html });
        return;
    }
    await t.sendMail({ from: env_1.env.EMAIL_USER, to, subject, html });
}
//# sourceMappingURL=email.js.map