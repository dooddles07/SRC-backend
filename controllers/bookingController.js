// controllers/bookingController.js
// Handles new bookings from portal (Webhook #1 → FORM-01)

const { validationResult } = require('express-validator');
const ghlService            = require('../models/ghlService');
const { generateBookingReference, computeTimestamps } = require('../models/referenceGenerator');
const bookingStore          = require('../models/bookingStore');

// ── Helper: convert "HH:MM" (24h) → "HH:MM AM/PM" (12h) ───────────────────
function to12Hour(time24) {
  const [h, m] = time24.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const h12    = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

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
      booking_shift,
      slot_date,
      slot_start_time,
      slot_end_time,
      outlet_pax,
      booking_type,
      special_request,
    } = req.body;

    // Reject bookings on past dates
    const todaySG = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
    if (slot_date < todaySG) {
      return res.status(422).json({ success: false, message: 'Cannot book on a past date.' });
    }

    // Generate reference number
    const booking_reference = generateBookingReference(slot_date);

    // Preserve plain HH:MM time for the slot_start_time custom field
    const slotTime = slot_start_time;

    // Build GHL-compatible datetime strings for the Book Appointment workflow action.
    // GHL expects: "YYYY-MM-DD HH:MM AM" (12-hour with AM/PM, no T separator).
    const startDateTime = `${slot_date} ${to12Hour(slot_start_time)}`;

    // If end time is earlier than or equal to start time the booking crosses midnight —
    // advance the end date by one day so GHL receives a valid appointment window.
    let endDate = slot_date;
    if (slot_end_time <= slot_start_time) {
      const d = new Date(`${slot_date}T00:00:00`);
      d.setDate(d.getDate() + 1);
      endDate = d.toISOString().split('T')[0];
    }
    const endDateTime = `${endDate} ${to12Hour(slot_end_time)}`;

    // Compute timestamps (these still need ISO format internally)
    const isoStart = `${slot_date}T${slot_start_time}:00`;
    const isoEnd   = `${endDate}T${slot_end_time}:00`;
    const timestamps = computeTimestamps(isoStart, isoEnd);

    // Send to GHL webhook (contact creation, custom fields, workflow triggers)
    await ghlService.sendBooking({
      email,
      phone,
      name,
      membership_number,
      facility_or_venue,
      calendar_id:       calendar_id || '',
      booking_shift:     booking_shift || '',
      slot_date,
      slot_start_time:   startDateTime,  // "YYYY-MM-DD HH:MM AM/PM" for Book Appointment action
      slot_end_time:     endDateTime,
      slot_time:         slotTime,        // plain HH:MM for contact.slot_start_time field
      outlet_pax,
      booking_reference,
      booking_type:      booking_type || 'advance',
      special_request:   special_request || '',
      ...timestamps,
    });

    // Save to DB immediately — GHL workflows are async so the contact
    // custom fields won't be ready by the time the dashboard calls /api/member/bookings
    await bookingStore.save({
      booking_reference,
      membership_number,
      ghl_contact_id:  req.user?.id || null,
      email,
      name,
      facility_or_venue,
      booking_type:    booking_type  || 'advance',
      booking_status:  'Confirmed',
      booking_shift:   booking_shift || '',
      slot_date,
      slot_start_time: slotTime,   // plain HH:MM — what the dashboard formatDisplayTime expects
      slot_end_time:   slot_end_time,
      outlet_pax:      outlet_pax   || null,
      notes:           special_request || null,
      created_at:      new Date().toISOString(),
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
