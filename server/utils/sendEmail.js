const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
    port: port,
    secure: port === 465, // true for 465 (SSL), false for 587 (TLS)
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
  });

  const message = {
    from: `"${process.env.FROM_NAME || 'Southern Waves'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER || 'no-reply@southernwaves.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  const info = await transporter.sendMail(message);
  console.log('[EMAIL SERVICE] Email sent successfully. ID: %s to %s', info.messageId, options.email);
  return info;
};

module.exports = sendEmail;
