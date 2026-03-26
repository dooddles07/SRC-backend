// controllers/checkinController.js
// Handles check-in validation + sends Webhook #5 → SHARED-07

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');
const bookingStore          = require('../models/bookingStore');

const validateAndCheckin = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const { booking_reference, checked_in_by } = req.body;

    // ── Step 1: Find booking in MongoDB ───────────────────────────────────────
    const booking = await bookingStore.getByReference(booking_reference);

    if (!booking) {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'INVALID_REFERENCE',
        message: 'Booking reference not found.',
      });
    }

    // ── Step 2: Validate ───────────────────────────────────────────────────────

    // Already checked in?
    if (booking.booking_status === 'Checked In') {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'ALREADY_CHECKED_IN',
        message: 'Member has already checked in.',
      });
    }

    // Booking cancelled, no-show, or not confirmed?
    if (!['Confirmed'].includes(booking.booking_status)) {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'INVALID_STATUS',
        message: `Booking status is ${booking.booking_status}.`,
      });
    }

    // Date check — slot_date must be today (SGT)
    const today   = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    const slotDay = booking.slot_date ? booking.slot_date.split('T')[0] : null;

    if (slotDay !== today) {
      return res.status(200).json({
        success: false,
        valid:   false,
        reason:  'WRONG_DATE',
        message: `Booking is for ${slotDay}, not today (${today}).`,
      });
    }

    // ── Step 3: Mark as checked in in MongoDB ─────────────────────────────────
    await bookingStore.updateStatus(booking_reference, 'Checked In');

    // ── Step 4: Send check-in webhook to GHL (best-effort) ────────────────────
    try {
      await ghlService.sendCheckin({
        email:             booking.email,
        booking_reference,
        checked_in_by,
      });
    } catch (ghlErr) {
      console.warn('[Checkin] GHL webhook failed (non-fatal):', ghlErr.message);
    }

    return res.status(200).json({
      success: true,
      valid:   true,
      message: 'Check-in confirmed.',
      contact: {
        name:              booking.name,
        email:             booking.email,
        booking_reference,
        facility_or_venue: booking.facility_or_venue,
        slot_date:         booking.slot_date,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { validateAndCheckin };
