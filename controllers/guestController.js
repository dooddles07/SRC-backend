// controllers/guestController.js
// Handles guest registration from portal (Webhook #3 → FORM-03)

const { validationResult }          = require('express-validator');
const ghlService                    = require('../models/ghlService');
const bookingStore                  = require('../models/bookingStore');
const { generateBookingReference }  = require('../models/referenceGenerator');

const registerGuest = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const {
      email,
      guest_name,
      guest_email,
      guest_phone,
      inviting_member_id,
      slot_date,
      facility_or_venue,
      booking_shift,
    } = req.body;

    const booking_reference = generateBookingReference(slot_date);

    await ghlService.sendGuestRegistration({
      email,
      guest_name,
      guest_email,
      guest_phone:        guest_phone || '',
      inviting_member_id,
      slot_date,
      facility_or_venue,
      booking_shift:      booking_shift || '',
      booking_reference,
    });

    await bookingStore.save({
      booking_reference,
      membership_number: inviting_member_id,
      email,
      name:              guest_name,
      facility_or_venue,
      booking_type:      'guest_pass',
      booking_status:    'Confirmed',
      booking_shift:     booking_shift || '',
      slot_date,
    });

    return res.status(200).json({
      success:           true,
      message:           'Guest registration sent to GHL.',
      booking_reference,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { registerGuest };
