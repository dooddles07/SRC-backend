// controllers/checkinController.js
// Handles check-in validation + sends Webhook #5 → SHARED-07

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');

const validateAndCheckin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { booking_reference, checked_in_by } = req.body;

    // ── Step 1: Find contact in GHL by booking_reference ──────────────────────
    const contact = await ghlService.findContactByReference(booking_reference);

    if (!contact) {
      return res.status(404).json({
        success: false,
        valid:   false,
        reason:  'INVALID_REFERENCE',
        message: 'Booking reference not found.',
      });
    }

    const getField = (key) =>
      contact.customFields?.find((f) => f.fieldKey === key)?.value || null;

    const bookingStatus  = getField('booking_status');
    const slotDate       = getField('slot_date');
    const checkedInAt    = getField('checked_in_at');
    const email          = contact.email;

    // ── Step 2: Validate ───────────────────────────────────────────────────────

    // Already checked in?
    if (checkedInAt || bookingStatus === 'checked_in') {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'ALREADY_CHECKED_IN',
        message: 'Member has already checked in.',
      });
    }

    // Booking cancelled or no-show?
    if (['cancelled', 'no_show'].includes(bookingStatus)) {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'INVALID_STATUS',
        message: `Booking status is ${bookingStatus}.`,
      });
    }

    // Date check — slot_date must be today
    const today    = new Date().toISOString().split('T')[0];
    const slotDay  = slotDate ? slotDate.split('T')[0] : null;

    if (slotDay !== today) {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'WRONG_DATE',
        message: `Booking is for ${slotDay}, not today (${today}).`,
      });
    }

    // ── Step 3: All valid — send check-in webhook to GHL ──────────────────────
    await ghlService.sendCheckin({
      email,
      booking_reference,
      checked_in_by,
    });

    return res.status(200).json({
      success: true,
      valid:   true,
      message: 'Check-in confirmed.',
      contact: {
        name:              contact.firstName + ' ' + (contact.lastName || ''),
        email,
        booking_reference,
        facility_or_venue: getField('facility_or_venue'),
        slot_date:         slotDate,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { validateAndCheckin };
