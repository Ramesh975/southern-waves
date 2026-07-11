const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  const message = {
    from: `"${process.env.FROM_NAME || 'Southern Waves'}" <${process.env.FROM_EMAIL || 'no-reply@southernwaves.com'}>`,
    to: options.email,
    subject: options.subject,
    html: options.html,
  };

  const info = await transporter.sendMail(message);
  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
