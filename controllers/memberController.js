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

// ── PUT /api/member/bookings/:reference ───────────────────────────────────────
// Allows a member to update editable fields on their own upcoming booking.
const updateMemberBooking = async (req, res, next) => {
  try {
    const { reference } = req.params;
    const { membership_number } = req.user;

    // Verify the booking belongs to this member
    const existing = await bookingStore.getByReference(reference);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }
    if (existing.membership_number !== membership_number) {
      return res.status(403).json({ success: false, message: 'Not authorised to edit this booking.' });
    }

    const status = (existing.booking_status || '').toLowerCase().replace(/[\s_]+/g, '-');
    if (['cancelled', 'checked-in', 'no-show'].includes(status)) {
      return res.status(400).json({ success: false, message: 'This booking can no longer be edited.' });
    }

    // Reject updates to a past date
    if (req.body.slot_date) {
      const todaySG = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
      if (req.body.slot_date < todaySG) {
        return res.status(422).json({ success: false, message: 'Cannot reschedule to a past date.' });
      }
    }

    const updated = await bookingStore.updateBooking(reference, req.body);
    return res.status(200).json({ success: true, booking: updated });
  } catch (err) {
    next(err);
  }
};

// ── PUT /api/member/profile ──────────────────────────────────────────────────
// Allows a member to update their own profile (name, email, phone).
// Persists changes to GHL so they survive logout/login.
const updateMemberProfile = async (req, res, next) => {
  try {
    const { id: contactId } = req.user;
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(422).json({ success: false, message: 'Name and email are required.' });
    }

    // Split full name into firstName / lastName for GHL
    const nameParts = name.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName  = nameParts.slice(1).join(' ') || '';

    const payload = { firstName, lastName, email };
    if (phone !== undefined) payload.phone = phone;

    await ghlService.ghlApiPut(`/contacts/${contactId}`, payload);

    return res.status(200).json({
      success: true,
      member: {
        membership_number: req.user.membership_number,
        name:  `${firstName} ${lastName}`.trim(),
        email,
        phone: phone || '',
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBookingByReference, getMemberBookings, updateMemberBooking, updateMemberProfile };
