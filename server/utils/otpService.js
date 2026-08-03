const crypto = require('crypto');
const sendEmail = require('./sendEmail');
const https = require('https');

/**
 * Generate a 6-digit numeric OTP string
 */
const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP via Email using sendEmail utility
 */
const sendEmailOtpCode = async (email, otp, purpose = 'Verification') => {
  const subject = `Southern Waves - Your ${purpose} OTP Code: ${otp}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #c8102e; margin-top: 0;">Southern Waves</h2>
      <p style="font-size: 16px; color: #374151;">Use the following 6-digit One-Time Password (OTP) to complete your ${purpose.toLowerCase()}:</p>
      <div style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111827; background-color: #f3f4f6; padding: 16px; text-align: center; border-radius: 8px; margin: 20px 0;">
        ${otp}
      </div>
      <p style="font-size: 14px; color: #6b7280;">This code is valid for 10 minutes. Please do not share this code with anyone.</p>
    </div>
  `;

  await sendEmail({
    email,
    subject,
    html,
  });
};

/**
 * Send OTP via Live Mobile SMS (Supports Fast2SMS, 2Factor.in, or Twilio via environment keys)
 */
const sendPhoneOtpCode = async (phone, otp, purpose = 'Verification') => {
  const cleanNumber = phone.replace(/\D/g, ''); // Extract 10-digit or full country code number
  const indianMobile = cleanNumber.length === 10 ? cleanNumber : (cleanNumber.length === 12 && cleanNumber.startsWith('91') ? cleanNumber.slice(2) : cleanNumber);

  console.log(`[SMS OTP SERVICE] Dispatching to: +91-${indianMobile} | Purpose: ${purpose} | OTP: ${otp}`);

  // Provider 1: Fast2SMS (Popular in India)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${process.env.FAST2SMS_API_KEY}&route=otp&variables_values=${otp}&numbers=${indianMobile}`;
      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      console.log(`[FAST2SMS] Live SMS sent to +91${indianMobile}`);
      return true;
    } catch (err) {
      console.error('[FAST2SMS ERROR]', err.message);
    }
  }

  // Provider 2: 2Factor.in (India SMS Gateway)
  if (process.env.TWOFACTOR_API_KEY) {
    try {
      const url = `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${indianMobile}/${otp}/AUTOGEN`;
      await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve(data));
        }).on('error', reject);
      });
      console.log(`[2FACTOR] Live SMS sent to +91${indianMobile}`);
      return true;
    } catch (err) {
      console.error('[2FACTOR ERROR]', err.message);
    }
  }

  // Fallback: Console log mode when no live SMS gateway key is configured in .env yet
  return true;
};

module.exports = {
  generateOtp,
  sendEmailOtpCode,
  sendPhoneOtpCode,
};
