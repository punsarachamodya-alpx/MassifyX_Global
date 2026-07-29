'use strict';

const nodemailer = require('nodemailer');

const store = require('./store');

let transporter = null;

// Built once, lazily, from whatever's in the environment right now — so a
// missing var at boot doesn't need a restart to pick up once it's added.
function getTransporter() {
  if (transporter) return transporter;
  if (!isConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined
  });
  return transporter;
}

// Delivery is "configured" purely from environment — not a checkbox someone
// can tick without actually wiring SMTP. Used both to decide whether to send
// and to drive the admin dashboard checklist.
function isConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

function notifyAddress() {
  return process.env.CONTACT_TO_EMAIL || store.getSection('site').contactEmail;
}

async function sendContactNotification(values) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP is not configured (SMTP_HOST is unset).');

  const site = store.getSection('site');
  const lines = Object.entries(values)
    .filter(([, v]) => v)
    .map(([key, v]) => `${key}: ${v}`)
    .join('\n');

  await t.sendMail({
    from: process.env.SMTP_FROM || `"${site.publicName} website" <no-reply@${hostFromEmail(notifyAddress())}>`,
    to: notifyAddress(),
    replyTo: values.email || undefined,
    subject: `New discovery call request — ${values.company || values.name || 'website'}`,
    text: lines
  });
}

function hostFromEmail(email) {
  return String(email).split('@')[1] || 'massifyx.com';
}

module.exports = { isConfigured, sendContactNotification, notifyAddress };
