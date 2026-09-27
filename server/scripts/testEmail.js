require('dotenv').config();
const sendEmail = require('../utils/sendEmail');

async function testConnection() {
  console.log('--- Testing Brevo Email Setup ---');
  console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp-relay.brevo.com');
  console.log('SMTP Port:', process.env.SMTP_PORT || '587');
  console.log('SMTP User (Login):', process.env.SMTP_USER || '(not configured)');
  console.log('From Email:', process.env.FROM_EMAIL || process.env.SMTP_USER || '(not configured)');
  console.log('From Name:', process.env.FROM_NAME || 'Southern Waves');

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error('\n❌ ERROR: SMTP_USER and/or SMTP_PASS are missing in your server/.env file.');
    console.log('Please add your Brevo credentials to server/.env and try again.');
    process.exit(1);
  }

  const targetEmail = process.argv[2] || process.env.FROM_EMAIL || process.env.SMTP_USER;
  console.log(`\nSending test verification email to: ${targetEmail}...`);

  try {
    const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const info = await sendEmail({
      email: targetEmail,
      subject: `Southern Waves - Test Verification Code (${testOtp})`,
      text: `Your test verification code is: ${testOtp}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #c8102e; margin-top: 0;">Southern Waves</h2>
          <p style="font-size: 16px; color: #374151;">Brevo Email Integration Test successful!</p>
          <p style="font-size: 14px; color: #374151;">Here is a sample OTP verification code:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
            ${testOtp}
          </div>
          <p style="font-size: 14px; color: #6b7280;">If you received this email, your Brevo SMTP setup is working perfectly.</p>
        </div>
      `,
    });

    console.log('\n✅ SUCCESS! Test email sent successfully.');
    console.log('Message ID:', info.messageId);
    console.log(`Check your inbox at ${targetEmail} (also check Spam/Promotions).`);
  } catch (err) {
    console.error('\n❍ FAILED to send test email:');
    console.error(err.message);
    if (err.code === 'EAUTH') {
      console.error('\nTip: Authentication failed. Please check your Brevo SMTP Key / Password and SMTP Login.');
    }
    process.exit(1);
  }
}

testConnection();