const nodemailer = require("nodemailer");

function parseBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v !== "string") return false;
  return ["1", "true", "yes", "y"].includes(v.toLowerCase().trim());
}

function parseIntSafe(v, fallback) {
  const n = Number.parseInt(String(v), 10);
  return Number.isFinite(n) ? n : fallback;
}

let cachedTransporter = null;

function createTransport() {
  // Sender SMTP configuration:
  // - Provide EMAIL_SERVICE (e.g., "gmail", "hotmail") OR
  // - Provide EMAIL_HOST (+ optional EMAIL_PORT/EMAIL_SECURE) for custom SMTP (recommended for non-Gmail)
  const service = process.env.EMAIL_SERVICE;
  const host = process.env.EMAIL_HOST;
  const port = parseIntSafe(process.env.EMAIL_PORT, 587);
  const secure = parseBool(process.env.EMAIL_SECURE); // true for 465
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  const debug = parseBool(process.env.EMAIL_DEBUG);

  if (!user || !pass) {
    throw new Error("Email configuration missing: set EMAIL_USER and EMAIL_PASS");
  }

  // Service shortcut (e.g., Gmail/Outlook). For Gmail, App Passwords are recommended.
  if (service) {
    return nodemailer.createTransport({
      service,
      auth: { user, pass },
      logger: debug,
      debug,
    });
  }

  // Generic SMTP (host required if no service)
  if (!host) {
    throw new Error("Email configuration missing: set EMAIL_SERVICE (e.g. gmail) OR EMAIL_HOST for SMTP");
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    logger: debug,
    debug,
  });
}

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const transporter = createTransport();
  // Optional: validate SMTP config (useful in dev/debug)
  if (parseBool(process.env.EMAIL_VERIFY) || parseBool(process.env.EMAIL_DEBUG)) {
    await transporter.verify();
  }
  cachedTransporter = transporter;
  return cachedTransporter;
}

async function sendMail({ to, subject, html, text }) {
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
  const transporter = await getTransporter();
  return transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendMail };


