// controllers/memberController.js
// Read-only data endpoints that the frontend calls to display booking info

const ghlService   = require('../models/ghlService');
const bookingStore = require('../models/bookingStore');

// ── GET /api/member/bookings ──────────────────────────────────────────────────
// Reads from MongoDB (written at booking time) so the dashboard has data
// immediately — no dependency on GHL's async workflow delay.
const getMemberBookings = async (req, res, next) => {
  try {
    const { membership_number } = req.user;

    const bookings = await bookingStore.getByMember(membership_number);

    return res.status(200).json({
      success:  true,
      count:    bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/member/:reference ────────────────────────────────────────────────
// Look up a single booking by its reference number (e.g. BK-20260325-412)
const getBookingByReference = async (req, res, next) => {
  try {
    const { reference } = req.params;

    const contact = await ghlService.findContactByReference(reference);

    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Booking reference not found.',
      });
    }

    const getField = (key) =>
      contact.customFields?.find((f) => f.fieldKey === `contact.${key}`)?.value || null;

    return res.status(200).json({
      success: true,
      booking: {
        booking_reference:     reference,
        name:                  `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email:                 contact.email,
        phone:                 contact.phone,
        membership_number:     getField('membership_number'),
        facility_or_venue:     getField('facility_or_venue'),
        slot_date:             getField('slot_date'),
        slot_start_time:       getField('slot_start_time'),
        slot_end_time:         getField('slot_end_time'),
        outlet_pax:            getField('outlet_pax'),
        booking_status:        getField('booking_status'),
        booking_type:          getField('booking_type'),
        checked_in_at:         getField('checked_in_at'),
        cancellation_deadline: getField('cancellation_deadline'),
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBookingByReference, getMemberBookings };
