// controllers/cancellationController.js
// Handles cancellations from portal (Webhook #2 → FORM-02)

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');

const cancelBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { email, booking_reference } = req.body;

    await ghlService.sendCancellation({ email, booking_reference });

    return res.status(200).json({
      success: true,
      message: 'Cancellation sent to GHL.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { cancelBooking };
