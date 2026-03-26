// controllers/bookingController.js
// Handles new bookings from portal (Webhook #1 → FORM-01)

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');
const { generateBookingReference, computeTimestamps } = require('../models/referenceGenerator');

const createBooking = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ success: false, errors: errors.array() });
    }

    const {
      email,
      phone,
      name,
      membership_number,
      facility_or_venue,
      calendar_id,
      slot_date,
      slot_start_time,
      slot_end_time,
      outlet_pax,
      booking_type,
      special_request,
    } = req.body;

    // Generate reference number
    const booking_reference = generateBookingReference(slot_date);

    // Preserve plain HH:MM time for the slot_start_time custom field
    const slotTime = slot_start_time;

    // Build full datetime strings for GHL calendar appointment (YYYY-MM-DDTHH:MM:SS)
    const startDateTime = `${slot_date}T${slot_start_time}:00`;
    const endDateTime   = `${slot_date}T${slot_end_time}:00`;

    // Compute timestamps
    const timestamps = computeTimestamps(startDateTime, endDateTime);

    // Send to GHL
    await ghlService.sendBooking({
      email,
      phone,
      name,
      membership_number,
      facility_or_venue,
      calendar_id:       calendar_id || '',
      slot_date,
      slot_start_time:   startDateTime,  // full ISO datetime for calendar appointment
      slot_end_time:     endDateTime,
      slot_time:         slotTime,        // plain HH:MM for contact.slot_start_time field
      outlet_pax,
      booking_reference,
      booking_type:      booking_type || 'advance',
      special_request:   special_request || '',
      ...timestamps,
    });

    return res.status(200).json({
      success: true,
      message: 'Booking received and sent to GHL.',
      booking_reference,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createBooking };
