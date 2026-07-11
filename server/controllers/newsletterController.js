const Newsletter = require('../models/Newsletter');
const sendEmail = require('../utils/sendEmail');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
exports.subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide an email address' });
    }

    let subscription = await Newsletter.findOne({ email });
    if (subscription) {
      return res.status(400).json({ success: false, message: 'This email is already subscribed to our newsletter' });
    }

    subscription = await Newsletter.create({ email });

    // Send confirmation email
    const subject = 'Welcome to the Southern Waves Newsletter 🌊';
    const html = `
      <h2>Thank you for subscribing to Southern Waves!</h2>
      <p>We are thrilled to have you join our student media movement. You will now receive weekly circulars, campus updates, and thought-provoking editorial pieces directly in your inbox.</p>
      <p>In solidarity,<br /><strong>The Southern Waves Editorial Team</strong></p>
    `;

    try {
      await sendEmail({
        email,
        subject,
        html,
      });
      subscription.confirmed = true;
      await subscription.save();
    } catch (emailErr) {
      console.error('Newsletter verification email could not be sent:', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to the newsletter!',
    });
  } catch (err) {
    next(err);
  }
};
