// controllers/walkinController.js
// Handles walk-in logging from staff (Webhook #4 → STAFF-01)

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');

const logWalkin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { name, phone, facility, pax, staff_id } = req.body;

    await ghlService.sendWalkin({ name, phone, facility, pax, staff_id });

    return res.status(200).json({
      success: true,
      message: 'Walk-in logged and sent to GHL.',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { logWalkin };
