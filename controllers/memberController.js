// controllers/memberController.js
// Read-only data endpoints that Kylie's frontend will call to display booking info

const ghlService = require('../models/ghlService');

// ── GET /api/booking/:reference ───────────────────────────────────────────────
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
      contact.customFields?.find((f) => f.fieldKey === key)?.value || null;

    return res.status(200).json({
      success: true,
      booking: {
        booking_reference:    reference,
        name:                 `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email:                contact.email,
        phone:                contact.phone,
        membership_number:    getField('membership_number'),
        facility_or_venue:    getField('facility_or_venue'),
        slot_date:            getField('slot_date'),
        slot_start_time:      getField('slot_start_time'),
        slot_end_time:        getField('slot_end_time'),
        outlet_pax:           getField('outlet_pax'),
        booking_status:       getField('booking_status'),
        booking_type:         getField('booking_type'),
        checked_in_at:        getField('checked_in_at'),
        cancellation_deadline: getField('cancellation_deadline'),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ── GET /api/member/bookings ──────────────────────────────────────────────────
// Get all bookings for the currently logged-in member (from JWT payload)
const getMemberBookings = async (req, res, next) => {
  try {
    // req.user is set by the authenticate middleware from the JWT
    const { membership_number } = req.user;

    let contacts = [];
    try {
      contacts = await ghlService.findContactsByMember(membership_number);
    } catch (ghlErr) {
      // GHL API is unavailable — return empty list so the dashboard still loads
      console.error(`[getMemberBookings] GHL API error: ${ghlErr.message}`);
      return res.status(200).json({ success: true, count: 0, bookings: [] });
    }

    if (!contacts.length) {
      return res.status(200).json({
        success:  true,
        count:    0,
        bookings: [],
      });
    }

    const getField = (contact, key) =>
      contact.customFields?.find((f) => f.fieldKey === key)?.value || null;

    const bookings = contacts.map((contact) => ({
      booking_reference:    getField(contact, 'booking_reference'),
      name:                 `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      email:                contact.email,
      facility_or_venue:    getField(contact, 'facility_or_venue'),
      slot_date:            getField(contact, 'slot_date'),
      slot_start_time:      getField(contact, 'slot_start_time'),
      slot_end_time:        getField(contact, 'slot_end_time'),
      outlet_pax:           getField(contact, 'outlet_pax'),
      booking_status:       getField(contact, 'booking_status'),
      booking_type:         getField(contact, 'booking_type'),
      checked_in_at:        getField(contact, 'checked_in_at'),
      cancellation_deadline: getField(contact, 'cancellation_deadline'),
    }));

    return res.status(200).json({
      success:  true,
      count:    bookings.length,
      bookings,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBookingByReference, getMemberBookings };
